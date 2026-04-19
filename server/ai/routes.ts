import { Router } from "express";
import { z } from "zod";
import {
  getAuditAnalysis,
  getAuditCollection,
  getAuditJob,
  getAuditResult,
} from "../audit/store.js";
import { generateCareerChatReply } from "./chat.js";

const chatRequestSchema = z.object({
  jobId: z.string().min(1),
  message: z.string().min(4).max(4000),
});

export const aiRouter = Router();

aiRouter.post("/chat", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid request body",
        details: parsed.error.flatten(),
      },
    });
  }

  const { jobId, message } = parsed.data;

  const job = getAuditJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Unknown jobId",
      },
    });
  }

  const result = getAuditResult(jobId);
  if (!result) {
    if (job.status === "failed") {
      return res.status(500).json({
        error: {
          code: "AUDIT_FAILED",
          message: job.message ?? "Audit failed",
        },
      });
    }

    return res.status(202).json({
      jobId,
      status: job.status,
      message:
        "Audit is still running. Chat becomes available after results are generated.",
    });
  }

  const collection = getAuditCollection(jobId);
  const analysis = getAuditAnalysis(jobId);

  const ai = await generateCareerChatReply({
    message,
    report: result,
    collection,
    analysis,
  });

  return res.json({
    jobId,
    generatedAt: Date.now(),
    modelUsed: ai.modelUsed,
    usage: ai.usage,
    response: ai.response,
  });
});
