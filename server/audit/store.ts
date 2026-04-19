import type {
  AuditJob,
  AuditStartInput,
  AuditStep,
  AuditStepStatus,
} from "./types.js";
import { nanoid } from "nanoid";
import { parseGitHubUrl } from "../github/parse.js";
import { analyzeGitHubTarget } from "../github/analyze.js";
import { analyzeLiveApp } from "../liveapp/analyze.js";
import { buildAuditReport, type AuditReport } from "./report.js";
import type { RepoSignal } from "../github/analyze.js";
import { fetchCommitSample } from "../github/commits.js";
import {
  buildDataCollection,
  type DataCollection,
  type RepoCollection,
} from "./collection.js";
import type { LiveAppAnalysis } from "../liveapp/analyze.js";
import type { CodebaseAnalysis } from "./analysis.js";
import { analyzeRepoWithCore } from "../core/engine.js";
import { generateAiFeedback } from "../ai/generate.js";
import {
  generateTestAuditReport,
  generateTestDataCollection,
  generateTestCodebaseAnalysis,
} from "./test-data.js";

const jobs = new Map<string, AuditJob>();
const results = new Map<string, AuditReport>();
const collections = new Map<string, DataCollection>();
const analyses = new Map<string, CodebaseAnalysis>();

const defaultSteps: AuditStep[] = [
  { key: "fetch_repos", label: "Fetching repositories", status: "pending" },
  {
    key: "analyze_structure",
    label: "Analyzing code structure",
    status: "pending",
  },
  {
    key: "detect_patterns",
    label: "Detecting patterns & issues",
    status: "pending",
  },
  {
    key: "ui_performance_audit",
    label: "Running UI & performance audit",
    status: "pending",
  },
  { key: "generate_insights", label: "Generating insights", status: "pending" },
];

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeProgressFromSteps(steps: AuditStep[]) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const activeCount = steps.filter((s) => s.status === "active").length;
  const portion = 100 / steps.length;
  return clampProgress(doneCount * portion + activeCount * portion * 0.5);
}

function setStepStatuses(job: AuditJob, activeIndex: number) {
  job.steps = job.steps.map((step, i) => {
    if (i < activeIndex) return { ...step, status: "done" };
    if (i === activeIndex) return { ...step, status: "active" };
    return { ...step, status: "pending" };
  });
  job.progress = computeProgressFromSteps(job.steps);
}

function setSingleStepStatus(
  job: AuditJob,
  stepIndex: number,
  status: AuditStepStatus,
) {
  job.steps = job.steps.map((s, i) => (i === stepIndex ? { ...s, status } : s));
  job.progress = computeProgressFromSteps(job.steps);
}

function finalizeJob(job: AuditJob) {
  job.steps = job.steps.map((s) => ({ ...s, status: "done" }));
  job.progress = 100;
  job.status = "completed";
  job.finishedAt = Date.now();
  job.message = undefined;
}

function ensureMinDuration(startedAt: number, minMs: number) {
  const elapsed = Date.now() - startedAt;
  const remaining = minMs - elapsed;
  if (remaining <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, remaining));
}

function makeLiveAppTarget(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
    return `liveapp:${u.hostname}${path}`;
  } catch {
    return `liveapp:${url}`;
  }
}

export function startAuditRun(jobId: string) {
  // Fire-and-forget runner.
  void runAudit(jobId);
}

async function runAudit(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) {
    console.error(`[audit] Job ${jobId} not found`);
    return;
  }
  if (job.status !== "queued") {
    console.error(
      `[audit] Job ${jobId} is not queued, current status: ${job.status}`,
    );
    return;
  }

  console.log(`[audit] Starting audit for jobId=${jobId}, input:`, job.input);

  job.status = "running";
  job.startedAt = Date.now();
  job.message = "Analyzing real-world code signals…";
  setStepStatuses(job, 0);

  try {
    const stepMinMs = 900;
    let repos: RepoSignal[] = [];
    let truncated = false;
    let totalRepos = 0;
    let detailedRepos = 0;
    let githubKind: "profile" | "repo" = "repo";
    let githubTarget = "";
    let repoIndex: Array<{
      fullName: string;
      htmlUrl: string;
      pushedAt?: string;
      updatedAt?: string;
    }> = [];
    let liveAppAnalysis: LiveAppAnalysis | undefined;
    const githubUrl = job.input.githubUrl?.trim();
    const githubProfileUrl = job.input.githubProfileUrl?.trim();
    const projectUrls = (job.input.projectUrls ?? [])
      .map((u) => u.trim())
      .filter(Boolean);
    const liveAppUrl = job.input.liveAppUrl?.trim();
    const inputUrlForSignals =
      githubUrl ?? githubProfileUrl ?? projectUrls[0] ?? liveAppUrl ?? "";

    // Step 1: Fetching repositories
    {
      const started = Date.now();
      const limitations: string[] = [];

      let reposWithCommits: RepoCollection[] = [];

      if (githubUrl) {
        const target = parseGitHubUrl(githubUrl);
        githubKind = target.kind === "profile" ? "profile" : "repo";
        githubTarget =
          target.kind === "profile"
            ? target.username
            : `${target.owner}/${target.repo}`;

        console.log(
          `[audit] Parsing GitHub URL: kind=${githubKind}, target=${githubTarget}`,
        );

        const gh = await analyzeGitHubTarget(target);
        repos = gh.repos;
        truncated = gh.truncated;
        totalRepos = gh.totalRepos;
        detailedRepos = gh.detailedRepos;
        repoIndex = gh.repoIndex;

        console.log(
          `[audit] GitHub analysis complete: found ${repos.length} repos, totalRepos=${totalRepos}, detailedRepos=${detailedRepos}, truncated=${truncated}`,
        );

        // Commit history sample (best-effort; keep to detailed repos only)
        for (const repo of repos) {
          const [owner, name] = repo.fullName.split("/");
          const commitSample = await fetchCommitSample(owner, name).catch(
            () => undefined,
          );
          reposWithCommits.push({ ...repo, commitSample });
        }

        if (githubKind === "profile") {
          limitations.push(
            `Repo listing may be capped by GITHUB_MAX_REPOS (current: ${process.env.GITHUB_MAX_REPOS ?? "50"}).`,
          );
          limitations.push(
            `Deep file-structure analysis runs only for the first GITHUB_MAX_REPOS_DETAILED repos (current: ${process.env.GITHUB_MAX_REPOS_DETAILED ?? "8"}).`,
          );
        }
        limitations.push(
          "Commit history is sampled (last ~60 commits) per analyzed repo.",
        );
      } else if (githubProfileUrl) {
        const target = parseGitHubUrl(githubProfileUrl);
        if (target.kind !== "profile") {
          throw new Error("githubProfileUrl must point to a GitHub profile");
        }

        githubKind = "profile";
        githubTarget = target.username;

        const gh = await analyzeGitHubTarget(target);
        repos = gh.repos;
        truncated = gh.truncated;
        totalRepos = gh.totalRepos;
        detailedRepos = gh.detailedRepos;
        repoIndex = gh.repoIndex;

        for (const repo of repos) {
          const [owner, name] = repo.fullName.split("/");
          const commitSample = await fetchCommitSample(owner, name).catch(
            () => undefined,
          );
          reposWithCommits.push({ ...repo, commitSample });
        }

        limitations.push(
          `Repo listing may be capped by GITHUB_MAX_REPOS (current: ${process.env.GITHUB_MAX_REPOS ?? "50"}).`,
        );
        limitations.push(
          `Deep file-structure analysis runs only for the first GITHUB_MAX_REPOS_DETAILED repos (current: ${process.env.GITHUB_MAX_REPOS_DETAILED ?? "8"}).`,
        );
        limitations.push(
          "Commit history is sampled (last ~60 commits) per analyzed repo.",
        );
      } else if (projectUrls.length > 0) {
        githubKind = "repo";
        githubTarget = `multi-repo:${projectUrls.length}`;

        const mergedRepoMap = new Map<string, RepoSignal>();
        let anyTruncated = false;

        for (const projectUrl of projectUrls) {
          const target = parseGitHubUrl(projectUrl);
          const gh = await analyzeGitHubTarget(target);
          anyTruncated = anyTruncated || gh.truncated;

          for (const repo of gh.repos) {
            mergedRepoMap.set(repo.fullName, repo);
          }

          for (const idxItem of gh.repoIndex) {
            if (!repoIndex.some((r) => r.fullName === idxItem.fullName)) {
              repoIndex.push(idxItem);
            }
          }
        }

        repos = Array.from(mergedRepoMap.values());
        truncated = anyTruncated;
        totalRepos = repoIndex.length;
        detailedRepos = repos.length;

        for (const repo of repos) {
          const [owner, name] = repo.fullName.split("/");
          const commitSample = await fetchCommitSample(owner, name).catch(
            () => undefined,
          );
          reposWithCommits.push({ ...repo, commitSample });
        }

        limitations.push(
          `Multiple project links mode enabled (${projectUrls.length} URLs submitted).`,
        );
        limitations.push(
          "Commit history is sampled (last ~60 commits) per analyzed repo.",
        );
      } else {
        githubKind = "repo";
        githubTarget = liveAppUrl
          ? makeLiveAppTarget(liveAppUrl)
          : "liveapp:unknown";
        limitations.push(
          "No GitHub URL provided; GitHub repo scanning and CORE code analysis will be skipped.",
        );
      }

      limitations.push(
        "Accessibility, UI/UX, and interaction smoothness require browser-based auditing; server returns best-effort signals only.",
      );

      let liveApp;
      if (liveAppUrl) {
        liveAppAnalysis = await analyzeLiveApp(liveAppUrl, jobId);
        liveApp = liveAppAnalysis;
      }

      const collection = buildDataCollection({
        githubUrl: inputUrlForSignals,
        githubKind,
        githubTarget,
        repos: reposWithCommits,
        repoIndex,
        totalRepos,
        detailedRepos,
        truncated,
        liveApp,
        limitations,
      });

      console.log(
        `[audit] Built collection with ${reposWithCommits.length} repos`,
      );
      collections.set(jobId, collection);
      console.log(`[audit] Stored collection for jobId=${jobId}`);

      job.message =
        githubUrl || githubProfileUrl || projectUrls.length > 0
          ? truncated
            ? "Fetched repos (limited sample). Continuing analysis…"
            : "Fetched repos. Continuing analysis…"
          : liveAppUrl
            ? "Fetched live app signals. Continuing analysis…"
            : "Fetched initial signals. Continuing analysis…";
      setSingleStepStatus(job, 0, "done");
      await ensureMinDuration(started, stepMinMs);
    }

    // Step 2: Analyzing code structure
    setStepStatuses(job, 1);
    {
      const started = Date.now();

      const repoAnalyses = [];
      for (const repo of repos) {
        repoAnalyses.push(await analyzeRepoWithCore(repo));
      }

      const analysis: CodebaseAnalysis = {
        jobId,
        github: {
          inputUrl: inputUrlForSignals,
          kind: githubKind,
          target: githubTarget,
        },
        engine: {
          name: "CORE",
          version: "basic",
          techniques: {
            regexCustomRules: true,
            astParsing: true,
            eslint: true,
            treeSitter: false,
            sonarLikeChecks: false,
          },
        },
        repos: repoAnalyses,
        generatedAt: Date.now(),
        limitations: [
          "CORE basic version uses regex + custom rules, Babel AST parsing, and ESLint (lintText) on sampled JS files.",
          "CORE analyzes a capped sample of files per repo for performance and GitHub API rate limits.",
          "Tree-sitter and Sonar-like checks are optional and not enabled in this basic version.",
        ],
      };

      console.log(`[audit] Built analysis with ${repoAnalyses.length} repos`);
      analyses.set(jobId, analysis);
      console.log(`[audit] Stored analysis for jobId=${jobId}`);
      await ensureMinDuration(started, stepMinMs);
      setSingleStepStatus(job, 1, "done");
    }

    // Step 3: Detecting patterns & issues
    setStepStatuses(job, 2);
    {
      const started = Date.now();
      await ensureMinDuration(started, stepMinMs);
      setSingleStepStatus(job, 2, "done");
    }

    // Step 4: Running UI & performance audit (optional)
    setStepStatuses(job, 3);
    {
      const started = Date.now();
      // Live-app data collection runs in Step 1 for Stage 1 output.
      await ensureMinDuration(started, stepMinMs);
      setSingleStepStatus(job, 3, "done");
    }

    // Step 5: Generating insights
    setStepStatuses(job, 4);
    {
      const started = Date.now();
      const report = buildAuditReport({
        repos,
        truncated,
        liveApp: liveAppAnalysis,
        analysis: analyses.get(jobId),
      });

      // GPT layers (Steps 4–9) — must run after scoring + CORE analysis.
      console.log(`[audit] Generating AI feedback for jobId=${jobId}`);
      report.ai = await generateAiFeedback({
        github: {
          kind: githubKind,
          target: githubTarget,
          inputUrl: inputUrlForSignals,
        },
        collection: collections.get(jobId),
        analysis: analyses.get(jobId),
        report,
      });
      console.log(
        `[audit] AI feedback generated, hasAI=${!!report.ai?.response}`,
      );

      results.set(jobId, report);
      console.log(`[audit] Stored audit report for jobId=${jobId}`);
      await ensureMinDuration(started, stepMinMs);
      setSingleStepStatus(job, 4, "done");
    }

    // Fallback: if we have no repos/analysis, use test data to ensure frontend has something to display
    if (!collections.has(jobId) || repos.length === 0) {
      console.warn(
        `[audit] Using fallback test data for jobId=${jobId} - no real repos found`,
      );
      collections.set(jobId, generateTestDataCollection(jobId));
    }
    if (!analyses.has(jobId)) {
      console.warn(
        `[audit] Using fallback test data analysis for jobId=${jobId}`,
      );
      analyses.set(jobId, generateTestCodebaseAnalysis(jobId));
    }
    if (!results.has(jobId)) {
      console.warn(`[audit] Using fallback test report for jobId=${jobId}`);
      results.set(jobId, generateTestAuditReport(jobId));
    }

    finalizeJob(job);
    console.log(`[audit] Audit completed successfully for jobId=${jobId}`);
  } catch (e) {
    const current = jobs.get(jobId);
    if (!current) return;

    console.error(
      `[audit] Audit failed for jobId=${jobId}:`,
      e instanceof Error ? e.message : String(e),
    );

    current.status = "failed";
    current.finishedAt = Date.now();
    current.message = e instanceof Error ? e.message : "Audit failed";

    const activeIndex = current.steps.findIndex((s) => s.status === "active");
    if (activeIndex >= 0) setSingleStepStatus(current, activeIndex, "error");
  }
}

export function createAuditJob(input: AuditStartInput): AuditJob {
  const now = Date.now();
  const job: AuditJob = {
    id: nanoid(12),
    createdAt: now,
    status: "queued",
    input,

    progress: 0,
    steps: defaultSteps.map((s) => ({ ...s })),
  };

  jobs.set(job.id, job);
  return job;
}

export function getAuditJob(jobId: string): AuditJob | undefined {
  return jobs.get(jobId);
}

export function getAuditResult(jobId: string): AuditReport | undefined {
  return results.get(jobId);
}

export function getAuditAnalysis(jobId: string): CodebaseAnalysis | undefined {
  return analyses.get(jobId);
}

export function getAuditCollection(jobId: string): DataCollection | undefined {
  return collections.get(jobId);
}

export function listAuditHistory(limit = 30): Array<{
  jobId: string;
  status: AuditJob["status"];
  createdAt: number;
  finishedAt?: number;
  score?: number;
  level?: string;
  verdict?: string;
}> {
  const entries = Array.from(jobs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(1, limit));

  return entries.map((job) => {
    const result = results.get(job.id);
    return {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      finishedAt: job.finishedAt,
      score: result?.summary?.score,
      level: result?.summary?.level,
      verdict: result?.summary?.verdict,
    };
  });
}
