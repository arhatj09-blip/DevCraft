import { z } from "zod";
import type { AuditReport } from "../audit/report.js";
import type { DataCollection } from "../audit/collection.js";
import type { CodebaseAnalysis } from "../audit/analysis.js";
import {
  callWithFallback,
  type GitHubModelsChatResult,
} from "./githubModels.js";

const aiChatResponseSchema = z.object({
  answer: z.string().min(1),
  keyFindings: z.array(z.string().min(1)).max(8).default([]),
  prioritizedActions: z
    .array(
      z.object({
        timeline: z.string().min(1),
        action: z.string().min(1),
        whyItMatters: z.string().min(1),
        evidenceExamples: z.array(z.string().min(1)).default([]),
      }),
    )
    .max(10)
    .default([]),
  roleMatch: z
    .object({
      qualifiedNow: z
        .array(
          z.object({
            role: z.string().min(1),
            why: z.array(z.string().min(1)).default([]),
          }),
        )
        .default([]),
      nextTargetRoles: z
        .array(
          z.object({
            role: z.string().min(1),
            blockers: z.array(z.string().min(1)).default([]),
          }),
        )
        .default([]),
    })
    .default({ qualifiedNow: [], nextTargetRoles: [] }),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
});

export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;

function buildCareerChatSystemPrompt(): string {
  return [
    "You are the AI brain of DevCraft: Developer Career Intelligence System (PS5).",
    "You must analyze supplied evidence and answer the user with brutally honest, career-ROI-focused feedback.",
    "Never invent repos, files, metrics, roles, or evidence. Only use provided JSON context.",
    "Your output must be strict JSON matching the requested schema.",
    "",
    "Mission alignment:",
    "- Compare demonstrated engineering ability vs implied/claimed level.",
    "- Highlight specific code-quality, security, architecture, testing, and documentation weaknesses.",
    "- Connect weaknesses to hiring impact and salary-band progression.",
    "- Recommend specific high-ROI fixes in prioritized order.",
    "- Keep advice traceable with evidenceExamples.",
    "",
    "Response style:",
    "- Be direct, concrete, and evidence-based.",
    "- Avoid generic advice like 'learn system design' without concrete evidence and action.",
    "- Prefer statements like: problem -> consequence -> fix -> career impact.",
  ].join("\n");
}

function buildChatContext(args: {
  message: string;
  report: AuditReport;
  collection?: DataCollection;
  analysis?: CodebaseAnalysis;
}): unknown {
  const { message, report, collection, analysis } = args;

  const topProjects = report.projects.slice(0, 8).map((project) => ({
    name: project.name,
    url: project.url,
    score: project.score,
    strengths: project.strengths.slice(0, 4),
    weaknesses: project.weaknesses.slice(0, 6),
    issues: project.issues.slice(0, 6).map((issue) => ({
      title: issue.title,
      severity: issue.severity,
      category: issue.category,
      example: issue.example,
    })),
  }));

  const coreFindings = (analysis?.repos ?? []).slice(0, 8).map((repo) => ({
    repoFullName: repo.repoFullName,
    summary: repo.summary,
    topFindings: repo.findings.slice(0, 8).map((finding) => ({
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      filePath: finding.filePath,
      line: finding.line,
      message: finding.message,
      evidence: finding.evidence,
    })),
    redFlags: repo.redFlags,
  }));

  return {
    userQuestion: message,
    audit: {
      summary: report.summary,
      strengths: report.strengths.slice(0, 8),
      weaknesses: report.weaknesses.slice(0, 10),
      skillGaps: report.skillGaps.slice(0, 10),
      roadmap: report.roadmap.slice(0, 8),
      careerInsights: report.careerInsights,
      resumeInsights: report.resumeInsights,
      liveApp: report.liveApp,
      projects: topProjects,
    },
    collection: collection
      ? {
          github: {
            inputUrl: collection.github.inputUrl,
            kind: collection.github.kind,
            target: collection.github.target,
            totalRepos: collection.github.totalRepos,
            detailedRepos: collection.github.detailedRepos,
            truncated: collection.github.truncated,
            languagesObserved: collection.github.languagesObserved,
          },
          liveApp: collection.liveApp,
          limitations: collection.limitations,
        }
      : undefined,
    analysis: {
      repoCount: analysis?.repos.length ?? 0,
      limitations: analysis?.limitations ?? [],
      repos: coreFindings,
    },
    responseContract: {
      answer: "string",
      keyFindings: ["string"],
      prioritizedActions: [
        {
          timeline: "string",
          action: "string",
          whyItMatters: "string",
          evidenceExamples: ["string"],
        },
      ],
      roleMatch: {
        qualifiedNow: [{ role: "string", why: ["string"] }],
        nextTargetRoles: [{ role: "string", blockers: ["string"] }],
      },
      confidence: "low|medium|high",
    },
  };
}

function buildFallbackResponse(
  message: string,
  report: AuditReport,
): AiChatResponse {
  const topIssues = report.projects
    .flatMap((project) =>
      project.issues
        .slice(0, 2)
        .map((issue) => `${project.name}: ${issue.example}`),
    )
    .slice(0, 5);

  const weakest = report.weaknesses
    .slice(0, 3)
    .map((w) => `${w.title} - ${w.whyItMatters}`);
  const qualifiedNow = report.careerInsights.suitableRoles.slice(0, 3);
  const nextTarget = report.careerInsights.notReadyFor
    .slice(0, 3)
    .map((role) => ({
      role: role.role,
      blockers: role.why,
    }));

  return {
    answer:
      `Could not reach AI model, so this response is generated from deterministic audit data for: ${message}. ` +
      `Current level is ${report.summary.level} (${report.summary.label}). Focus on the highest-signal weaknesses first to maximize career ROI.`,
    keyFindings: weakest.length ? weakest : [report.summary.verdict],
    prioritizedActions: report.roadmap.slice(0, 5).map((item) => ({
      timeline: item.timeline,
      action: item.action,
      whyItMatters: item.why,
      evidenceExamples: topIssues.length
        ? topIssues.slice(0, 2)
        : [report.summary.verdict],
    })),
    roleMatch: {
      qualifiedNow: qualifiedNow.map((role) => ({
        role: role.role,
        why: role.why,
      })),
      nextTargetRoles: nextTarget,
    },
    confidence: "medium",
  };
}

export async function generateCareerChatReply(input: {
  message: string;
  report: AuditReport;
  collection?: DataCollection;
  analysis?: CodebaseAnalysis;
}): Promise<GitHubModelsChatResult & { response: AiChatResponse }> {
  const system = buildCareerChatSystemPrompt();
  const userJson = buildChatContext(input);

  try {
    const modelResult = await callWithFallback({ system, userJson });
    const parsed = aiChatResponseSchema.safeParse(modelResult.response);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new Error(
        `Chat response schema mismatch at ${firstIssue?.path.join(".") || "(root)"}: ${firstIssue?.message || "invalid response"}`,
      );
    }

    return {
      modelUsed: modelResult.modelUsed,
      cached: false,
      usage: modelResult.usage,
      response: parsed.data,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI chat call failed";
    console.warn(`[ai-chat] fallback due to: ${message}`);

    return {
      modelUsed: "unavailable",
      cached: false,
      response: buildFallbackResponse(input.message, input.report),
    };
  }
}
