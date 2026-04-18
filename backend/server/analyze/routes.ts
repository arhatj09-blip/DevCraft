import { Router } from "express";
import { z } from "zod";
import {
  createAuditJob,
  getAuditJob,
  getAuditResult,
  startAuditRun,
} from "../audit/store.js";
import { getCachedAiForUsername } from "../ai/generate.js";
import { resolveAuditFailure } from "../audit/errors.js";

const usernameSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(
    /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/u,
    "Invalid GitHub username",
  );

const analyzeSchema = z.object({
  username: usernameSchema,
  liveAppUrl: z.string().optional(),
});

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const analyzeRouter = Router();

// Returns the GPT JSON (Steps 4–9) for a GitHub username.
// Uses cache first (2h TTL) to avoid hitting GitHub Models rate limits.
analyzeRouter.post("/", async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid request body",
        details: parsed.error.flatten(),
      },
    });
  }

  const { username, liveAppUrl } = parsed.data;

  const cached = getCachedAiForUsername(username);
  if (cached?.response && typeof cached.response === "object") {
    return res.json(cached.response);
  }

  const job = createAuditJob({
    githubUrl: `https://github.com/${username}`,
    liveAppUrl,
  });

  startAuditRun(job.id);

  // Wait for completion (best-effort). If it takes too long, return 202 + jobId.
  const timeoutMs = 120_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const current = getAuditJob(job.id);
    if (!current) break;
    if (current.status === "completed") break;
    if (current.status === "failed") {
      const failure = resolveAuditFailure({
        message: current.message,
        errorCode: current.errorCode,
      });

      return res.status(failure.status).json({
        error: {
          code: failure.code,
          message: failure.message,
        },
      });
    }
    await sleep(500);
  }

  const done = getAuditJob(job.id);
  if (!done || done.status !== "completed") {
    return res.status(202).json({
      jobId: job.id,
      status: done?.status ?? "running",
      message: done?.message ?? "Analysis running",
    });
  }

  const result = getAuditResult(job.id);
  const ai = result?.ai?.response;
  if (!ai || typeof ai !== "object") {
    return res.status(500).json({
      error: {
        code: "AI_MISSING",
        message: "AI response missing from completed analysis",
      },
    });
  }

  return res.json(ai);
});
