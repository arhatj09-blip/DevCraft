import { Router } from "express";
import { z } from "zod";
import {
  createAuditJob,
  getAuditAnalysis,
  getAuditCollection,
  getAuditJob,
  getAuditResult,
  listAuditHistory,
  startAuditRun,
} from "./store.js";
import { generatePDF } from "./pdf-generator.js";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isGitHubDotComUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host === "github.com" || host === "www.github.com";
  } catch {
    return false;
  }
}

const startAuditSchema = z
  .object({
    // Preferred: a single URL input that can be a GitHub profile/repo OR a live website.
    inputUrl: z.string().min(1).optional(),
    // Backwards compatible fields.
    githubUrl: z.string().min(1).optional(),
    githubProfileUrl: z.string().min(1).optional(),
    projectUrls: z.array(z.string().min(1)).optional(),
    liveAppUrl: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const rawInputUrl = data.inputUrl?.trim();
    const rawGithubUrl = data.githubUrl?.trim();
    const rawGithubProfileUrl = data.githubProfileUrl?.trim();
    const rawLiveAppUrl = data.liveAppUrl?.trim();
    const rawProjectUrls = (data.projectUrls ?? []).map((u) => u.trim());

    if (
      !rawInputUrl &&
      !rawGithubUrl &&
      !rawGithubProfileUrl &&
      rawProjectUrls.length === 0 &&
      !rawLiveAppUrl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inputUrl"],
        message: "Provide either a GitHub URL or a live app URL",
      });
      return;
    }

    if (rawGithubUrl) {
      if (!isHttpUrl(rawGithubUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["githubUrl"],
          message: "GitHub URL must be a valid URL",
        });
      } else if (!isGitHubDotComUrl(rawGithubUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["githubUrl"],
          message: "GitHub URL must be a github.com URL",
        });
      }
    }

    if (rawGithubProfileUrl) {
      if (!isHttpUrl(rawGithubProfileUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["githubProfileUrl"],
          message: "GitHub profile URL must be a valid URL",
        });
      } else if (!isGitHubDotComUrl(rawGithubProfileUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["githubProfileUrl"],
          message: "GitHub profile URL must be a github.com URL",
        });
      }
    }

    rawProjectUrls.forEach((projectUrl, index) => {
      if (!isHttpUrl(projectUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["projectUrls", index],
          message: "Project URL must be a valid URL",
        });
        return;
      }
      if (!isGitHubDotComUrl(projectUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["projectUrls", index],
          message: "Project URL must be a github.com URL",
        });
      }
    });

    if (rawLiveAppUrl) {
      if (!isHttpUrl(rawLiveAppUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["liveAppUrl"],
          message: "Live app URL must be a valid http(s) URL",
        });
      }
    }

    if (rawInputUrl) {
      if (!isHttpUrl(rawInputUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inputUrl"],
          message: "inputUrl must be a valid http(s) URL",
        });
      }
    }
  })
  .transform((data) => {
    const inputUrl = data.inputUrl?.trim();
    const githubUrl = data.githubUrl?.trim();
    const githubProfileUrl = data.githubProfileUrl?.trim();
    const projectUrls = (data.projectUrls ?? [])
      .map((u) => u.trim())
      .filter(Boolean);
    const liveAppUrl = data.liveAppUrl?.trim();

    if (githubUrl || githubProfileUrl || projectUrls.length > 0 || liveAppUrl) {
      return {
        githubUrl: githubUrl,
        githubProfileUrl: githubProfileUrl,
        projectUrls,
        liveAppUrl: liveAppUrl,
      };
    }

    if (!inputUrl) {
      return {
        githubUrl: undefined,
        githubProfileUrl: undefined,
        projectUrls: [],
        liveAppUrl: undefined,
      };
    }

    if (isGitHubDotComUrl(inputUrl)) {
      return {
        githubUrl: inputUrl,
        githubProfileUrl: undefined,
        projectUrls: [],
        liveAppUrl: undefined,
      };
    }

    return {
      githubUrl: undefined,
      githubProfileUrl: undefined,
      projectUrls: [],
      liveAppUrl: inputUrl,
    };
  });

export const auditRouter = Router();

auditRouter.get("/history", (req, res) => {
  const limitRaw = Number(req.query.limit ?? 30);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(100, limitRaw))
    : 30;
  return res.json(listAuditHistory(limit));
});

auditRouter.post("/start", (req, res) => {
  const parsed = startAuditSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid request body",
        details: parsed.error.flatten(),
      },
    });
  }

  const job = createAuditJob({
    githubUrl: parsed.data.githubUrl,
    githubProfileUrl: parsed.data.githubProfileUrl,
    projectUrls: parsed.data.projectUrls,
    liveAppUrl: parsed.data.liveAppUrl,
  });

  startAuditRun(job.id);

  return res.status(201).json({
    jobId: job.id,
    status: job.status,
  });
});

auditRouter.get("/:jobId/status", (req, res) => {
  const jobId = req.params.jobId;
  const job = getAuditJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Unknown jobId",
      },
    });
  }

  return res.json({
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    progress: job.progress,
    steps: job.steps,
    message: job.message,
  });
});

auditRouter.get("/:jobId/result", (req, res) => {
  const jobId = req.params.jobId;
  const job = getAuditJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Unknown jobId" },
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
      message: job.message,
    });
  }

  return res.json(result);
});

auditRouter.get("/:jobId/collection", (req, res) => {
  const jobId = req.params.jobId;
  const job = getAuditJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Unknown jobId" },
    });
  }

  const collection = getAuditCollection(jobId);
  if (!collection) {
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
      message: job.message,
    });
  }

  return res.json(collection);
});

auditRouter.get("/:jobId/analysis", (req, res) => {
  const jobId = req.params.jobId;
  const job = getAuditJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Unknown jobId" },
    });
  }

  const analysis = getAuditAnalysis(jobId);
  if (!analysis) {
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
      message: job.message,
    });
  }

  return res.json(analysis);
});

auditRouter.get("/:jobId/pdf", async (req, res) => {
  const jobId = req.params.jobId;
  const job = getAuditJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Unknown jobId" },
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
      message: job.message,
    });
  }

  try {
    const pdfBuffer = await generatePDF(result);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="DevSkill-Audit-Report-${jobId}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({
      error: {
        code: "PDF_GENERATION_FAILED",
        message: "Failed to generate PDF report",
      },
    });
  }
});

auditRouter.get("/:jobId/diagnostic", (req, res) => {
  const jobId = req.params.jobId;
  const job = getAuditJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Unknown jobId" },
    });
  }

  const result = getAuditResult(jobId);
  const collection = getAuditCollection(jobId);
  const analysis = getAuditAnalysis(jobId);

  return res.json({
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      steps: job.steps,
      message: job.message,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    },
    hasResult: !!result,
    resultSummary: result
      ? {
          hasSummary: !!result.summary,
          projectCount: result.projects?.length ?? 0,
          hasAI: !!result.ai,
        }
      : null,
    hasCollection: !!collection,
    collectionSummary: collection
      ? {
          github: collection.github
            ? {
                repoCount: collection.github.repos?.length ?? 0,
                kind: collection.github.kind,
                target: collection.github.target,
              }
            : null,
          hasLiveApp: !!collection.liveApp,
        }
      : null,
    hasAnalysis: !!analysis,
    analysisSummary: analysis
      ? {
          repoCount: analysis.repos?.length ?? 0,
        }
      : null,
  });
});

auditRouter.get("/:jobId/share", (req, res) => {
  const jobId = req.params.jobId;
  const job = getAuditJob(jobId);
  if (!job) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Unknown jobId" },
    });
  }

  return res.json({
    jobId,
    sharePath: `/results?jobId=${encodeURIComponent(jobId)}`,
  });
});
