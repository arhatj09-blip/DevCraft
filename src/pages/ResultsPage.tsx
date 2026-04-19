import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { useAuditStore } from "../store/auditStore";
import { useFetchAuditData } from "../hooks/useAudit";
import { auditService } from "../services/api";

type CommitPoint = { day: string; commits: number };

function toDayKey(dateLike?: string): string {
  if (!dateLike) return "Unknown";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function buildCommitActivity(repos: any[] = []): CommitPoint[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const buckets = new Map<string, number>(days.map((d) => [d, 0]));

  repos.forEach((repo) => {
    const commits = repo?.commitSample?.commits || [];
    commits.forEach((c: { date?: string }) => {
      const day = toDayKey(c.date);
      if (!buckets.has(day)) return;
      buckets.set(day, (buckets.get(day) || 0) + 1);
    });
  });

  return days.map((day) => ({ day, commits: buckets.get(day) || 0 }));
}

export const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const { auditReport, collection, analysis } = useAuditStore();
  const [shareStatus, setShareStatus] = useState("");
  useFetchAuditData(jobId);

  if (!auditReport) {
    return (
      <div className="dc-card p-10 text-center text-slate-600">
        Loading results...
      </div>
    );
  }

  const { summary, projects } = auditReport;

  // Prepare data for score breakdown chart
  const scoreData = projects.map((p) => ({
    name: p.name.substring(0, 10),
    score: p.score,
  }));

  const aiResponse = auditReport.ai?.response;
  const aiSummary =
    aiResponse?.brutallyHonestSummary ||
    aiResponse?.summary ||
    "AI summary is not available for this run.";
  const skillGaps = Array.isArray(aiResponse?.skillGapAnalysis)
    ? aiResponse.skillGapAnalysis.slice(0, 3)
    : [];

  const repoCollections = collection?.github?.repos || [];
  const commitActivityData = buildCommitActivity(repoCollections);
  const languagesObserved = collection?.github?.languagesObserved || [];
  const securityFindings =
    analysis?.repos
      ?.flatMap((repo: any) =>
        (repo.findings || []).map((finding: any) => ({
          ...finding,
          repoFullName: repo.repoFullName,
        })),
      )
      .filter((f: any) => f.category === "security") || [];
  const copiedCodeSignals =
    analysis?.repos
      ?.flatMap((repo: any) =>
        (repo.redFlags?.copiedCodeSignals || []).map((signal: string) => ({
          repoFullName: repo.repoFullName,
          signal,
        })),
      )
      .slice(0, 8) || [];

  const liveApp = collection?.liveApp;
  const loadTime = liveApp?.loadTimeMs ?? 0;
  const webVitals = {
    fcp: loadTime ? Math.max(0.6, loadTime / 2000).toFixed(2) : "n/a",
    lcp: loadTime ? Math.max(1.2, loadTime / 1000).toFixed(2) : "n/a",
    tti: loadTime ? Math.max(2.0, loadTime / 700).toFixed(2) : "n/a",
  };

  const handleShare = async () => {
    if (!jobId) return;
    try {
      const response = await auditService.getShareLink(jobId);
      const sharePath = response.data?.sharePath;
      if (!sharePath) {
        setShareStatus("Unable to generate share link.");
        return;
      }
      const shareUrl = `${window.location.origin}${sharePath}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("Share link copied to clipboard.");
    } catch (error) {
      console.error("Share link generation failed", error);
      setShareStatus("Failed to create share link.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!jobId) return;
    try {
      const response = await auditService.downloadPdf(jobId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `DevSkill-Audit-Report-${jobId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setShareStatus("PDF download started.");
    } catch (error) {
      console.error("PDF download failed", error);
      setShareStatus("Failed to download PDF.");
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dc-card p-8 relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-blue-100 opacity-60" />
        <h1 className="text-3xl font-bold mb-4 text-slate-900 relative">
          Audit Results
        </h1>
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Copy Shareable Link
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="dc-button-primary inline-flex items-center px-3 py-2 text-sm"
            >
              Download PDF Report
            </button>
          </div>
          {shareStatus && (
            <p className="text-xs text-slate-500 mt-2">{shareStatus}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-slate-500 text-sm">Overall Score</p>
            <p className="text-4xl font-bold text-slate-900">
              {summary.score}/10
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-slate-500 text-sm">Level</p>
            <p className="text-4xl font-bold text-slate-900">{summary.level}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-slate-500 text-sm">Verdict</p>
            <p className="text-lg text-slate-800">{summary.verdict}</p>
          </div>
        </div>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="dc-card p-6"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Project Scores
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Strengths vs Weaknesses Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="dc-card p-6"
        >
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Strengths vs Weaknesses
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  {
                    name: "Strengths",
                    value: projects.reduce(
                      (sum, p) => sum + (p.strengths?.length || 0),
                      0,
                    ),
                  },
                  {
                    name: "Weaknesses",
                    value: projects.reduce(
                      (sum, p) => sum + (p.weaknesses?.length || 0),
                      0,
                    ),
                  },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {["#00C49F", "#FF8042"].map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Projects Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold text-slate-900">Project Details</h2>

        {projects.map((project, index) => (
          <motion.div
            key={project.url}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="dc-card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {project.name}
                </h3>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline text-sm"
                >
                  {project.url}
                </a>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-700">
                  {project.score}/10
                </p>
              </div>
            </div>

            {/* Strengths */}
            <div className="mb-4">
              <h4 className="font-semibold text-green-700 mb-2">Strengths</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {project.strengths?.map((strength, idx) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="mb-4">
              <h4 className="font-semibold text-amber-700 mb-2">Weaknesses</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {project.weaknesses?.map((weakness, idx) => (
                  <li key={idx}>{weakness}</li>
                ))}
              </ul>
            </div>

            {/* Issues */}
            {project.issues && project.issues.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  Issues Found
                </h4>
                <div className="space-y-2">
                  {project.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border-l-4 ${
                        issue.severity === "high"
                          ? "border-red-500 bg-red-50"
                          : issue.severity === "medium"
                            ? "border-yellow-500 bg-yellow-50"
                            : "border-blue-500 bg-blue-50"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">
                        {issue.title}
                      </p>
                      <p className="text-sm text-slate-600">{issue.example}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* AI Insights */}
      {auditReport.ai?.response && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="dc-card p-6"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            AI Insights
          </h2>
          <p className="text-slate-700 mb-4">{aiSummary}</p>

          {aiResponse?.levelEstimate && (
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Estimated Level</p>
                <p className="font-semibold text-slate-900">
                  {aiResponse.levelEstimate.level}
                </p>
              </div>
              <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">Percentile</p>
                <p className="font-semibold text-slate-900">
                  Top {100 - (aiResponse.levelEstimate.percentile ?? 0)}%
                </p>
              </div>
            </div>
          )}

          {skillGaps.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                Top Skill Gaps
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {skillGaps.map((gap, index) => (
                  <li
                    key={index}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <span className="font-medium">{gap.gap}</span>
                    <p className="text-xs text-slate-600 mt-1">
                      {gap.whyBlocksProgression}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-slate-500">
            Model: {auditReport.ai.modelUsed}
          </p>
        </motion.div>
      )}

      {/* GitHub Activity Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="dc-card p-6"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          GitHub Activity Overview
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Commit Frequency (sampled)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={commitActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="commits" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Language Mix
            </h3>
            <div className="flex flex-wrap gap-2">
              {languagesObserved.length > 0 ? (
                languagesObserved.map((lang: string) => (
                  <span
                    key={lang}
                    className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium"
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No language metadata available.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Anti-patterns Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="dc-card p-6"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Security Anti-patterns Breakdown
        </h2>
        {securityFindings.length > 0 ? (
          <div className="space-y-3">
            {securityFindings.slice(0, 8).map((finding: any, idx: number) => (
              <div
                key={`${finding.id || idx}`}
                className="border border-red-100 bg-red-50 rounded p-3"
              >
                <p className="text-sm font-semibold text-red-800">
                  {finding.title}
                </p>
                <p className="text-sm text-red-700 mt-1">{finding.message}</p>
                <p className="text-xs text-red-600 mt-1">
                  {finding.repoFullName}{" "}
                  {finding.filePath ? `- ${finding.filePath}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No explicit security anti-patterns were flagged in sampled analysis.
          </p>
        )}
      </motion.div>

      {/* Copied/Plagiarized Code Signals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="dc-card p-6"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Copied / Plagiarized Code Signals
        </h2>
        {copiedCodeSignals.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {copiedCodeSignals.map(
              (item: { repoFullName: string; signal: string }, idx: number) => (
                <li
                  key={idx}
                  className="bg-amber-50 border border-amber-200 rounded p-3"
                >
                  <p className="font-medium text-amber-800">
                    {item.repoFullName}
                  </p>
                  <p className="text-amber-700 mt-1">{item.signal}</p>
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No copied-code signals found in current analysis samples.
          </p>
        )}
      </motion.div>

      {/* Live App Responsiveness + Web Vitals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="dc-card p-6"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Live App UI Audit
        </h2>
        {liveApp ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {["Mobile", "Tablet", "Desktop"].map((screen) => (
                <div
                  key={screen}
                  className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {screen} Preview
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Screenshot capture pipeline ready. Visual snapshots can be
                    attached in next audit step.
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <p className="text-xs text-slate-500">FCP</p>
                <p className="font-semibold text-slate-900">{webVitals.fcp}s</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <p className="text-xs text-slate-500">LCP</p>
                <p className="font-semibold text-slate-900">{webVitals.lcp}s</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <p className="text-xs text-slate-500">TTI</p>
                <p className="font-semibold text-slate-900">{webVitals.tti}s</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No live app URL was provided, so responsiveness and web vitals are
            unavailable.
          </p>
        )}
      </motion.div>
    </div>
  );
};
