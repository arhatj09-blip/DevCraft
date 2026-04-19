import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { auditService } from "../services/api";
import { useAuditStore } from "../store/auditStore";

export const LandingPage = () => {
  const navigate = useNavigate();
  const { setJobId } = useAuditStore();
  const [githubUrl, setGithubUrl] = useState("");
  const [githubProfileUrl, setGithubProfileUrl] = useState("");
  const [projectLinksText, setProjectLinksText] = useState("");
  const [liveAppUrl, setLiveAppUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const projectUrls = projectLinksText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (
      !githubUrl &&
      !githubProfileUrl &&
      projectUrls.length === 0 &&
      !liveAppUrl
    ) {
      setError("Please enter at least one URL");
      return;
    }

    setLoading(true);
    try {
      const response = await auditService.startAudit({
        githubUrl: githubUrl || undefined,
        githubProfileUrl: githubProfileUrl || undefined,
        projectUrls: projectUrls.length > 0 ? projectUrls : undefined,
        liveAppUrl: liveAppUrl || undefined,
      });

      const { jobId } = response.data;
      setJobId(jobId);
      navigate(`/audit?jobId=${jobId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start audit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:col-span-2 dc-card p-8"
      >
        <span className="dc-chip mb-4">PS5: Developer Career Intelligence</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
          Stop guessing your level.
          <br />
          Start measuring it.
        </h1>
        <p className="text-slate-600 mb-6">
          We audit your repos and live app evidence to reveal skill gaps, hiring
          fit, and high-ROI next actions.
        </p>

        <div className="space-y-3 mb-6">
          {[
            "Code quality, architecture, and security checks",
            "Role-fit and salary-gap signal mapping",
            "Evidence-backed 90-day improvement roadmap",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 text-sm text-slate-700"
            >
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-[var(--dc-warning-soft)] p-4">
          <p className="text-xs text-slate-700 font-semibold uppercase tracking-wide mb-2">
            Audit Workflow
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div className="rounded-lg bg-white border border-slate-200 px-2 py-2 text-center">
              Fetch
            </div>
            <div className="rounded-lg bg-white border border-slate-200 px-2 py-2 text-center">
              Analyze
            </div>
            <div className="rounded-lg bg-white border border-slate-200 px-2 py-2 text-center">
              Advise
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="lg:col-span-3 dc-card p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Start New Audit
            </h2>
            <p className="text-sm text-slate-600">
              Use at least one input URL to begin.
            </p>
          </div>
          <span className="dc-chip">Estimated 45–60s</span>
        </div>

        <form onSubmit={handleStartAudit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              GitHub Repository URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/username/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="dc-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                GitHub Profile URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/username"
                value={githubProfileUrl}
                onChange={(e) => setGithubProfileUrl(e.target.value)}
                className="dc-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Live App URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                value={liveAppUrl}
                onChange={(e) => setLiveAppUrl(e.target.value)}
                className="dc-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Multiple Project Links (one per line or comma-separated)
            </label>
            <textarea
              placeholder={
                "https://github.com/user/repo-one\nhttps://github.com/user/repo-two"
              }
              value={projectLinksText}
              onChange={(e) => setProjectLinksText(e.target.value)}
              rows={3}
              className="dc-input"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="dc-button-primary px-5 py-2.5 disabled:opacity-50"
            >
              {loading ? "Starting Audit..." : "Start Audit"}
            </button>
            <span className="text-xs text-slate-500">
              Tip: Profile URL gives broader benchmarking than single repo.
            </span>
          </div>
        </form>
      </motion.section>
    </div>
  );
};
