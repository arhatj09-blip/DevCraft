import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useFetchAuditData, useFetchJobs } from "../hooks/useAudit";
import { useAuditStore } from "../store/auditStore";

export const CareerInsightsPage = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [jobMode, setJobMode] = useState<"all" | "local" | "remote">("all");
  const { auditReport } = useAuditStore();
  const auditLoading = useFetchAuditData(jobId);
  const { jobs, loading } = useFetchJobs(jobId, jobMode);

  if (!jobId) {
    return (
      <div className="dc-card p-8 text-center text-slate-600">
        No audit data available
      </div>
    );
  }

  const reportRoles = auditReport?.careerInsights?.suitableRoles || [];
  const aiReadyRoles = auditReport?.ai?.response?.roleReadiness?.ready || [];
  const suitableRoles =
    reportRoles.length > 0
      ? reportRoles
      : aiReadyRoles.map((role: { role: string; why: string[] }) => ({
          role: role.role,
          why: role.why || [],
        }));

  const reportNotReady = auditReport?.careerInsights?.notReadyFor || [];
  const aiNotReady = auditReport?.ai?.response?.roleReadiness?.notReady || [];
  const developmentVectors =
    reportNotReady.length > 0
      ? reportNotReady
      : aiNotReady.map((role: { role: string; why: string[] }) => ({
          role: role.role,
          why: role.why || [],
        }));

  if (auditLoading && !auditReport) {
    return (
      <div className="dc-card p-8 text-center text-slate-600">
        Loading career insights...
      </div>
    );
  }

  const percentile = auditReport?.ai?.response?.levelEstimate?.percentile;
  const salaryGapSkills =
    auditReport?.ai?.response?.skillGapAnalysis
      ?.slice(0, 3)
      ?.map((g: { gap: string }) => g.gap) || [];

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dc-card p-8"
      >
        <h1 className="text-3xl font-bold mb-2 text-slate-900">
          Career Insights
        </h1>
        <p className="text-slate-600">
          Discover career opportunities based on your skills
        </p>

        {typeof percentile === "number" && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-sm">
            <span className="font-semibold text-blue-800">
              Percentile Ranking:
            </span>
            <span>
              Top {100 - percentile}% of developers in this benchmark.
            </span>
          </div>
        )}
      </motion.div>

      {/* Development Vectors */}
      {developmentVectors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Development Vectors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {developmentVectors.map(
              (role: { role: string; why?: string[] }, index: number) => (
                <motion.div
                  key={`${role.role}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + index * 0.1 }}
                  className="dc-card p-6 border-l-4 border-amber-500"
                >
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {role.role}
                  </h3>
                  <ul className="space-y-2">
                    {role.why?.map((reason: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-start space-x-2 text-slate-700"
                      >
                        <span className="text-amber-500 font-bold mt-1">!</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ),
            )}
          </div>
        </motion.div>
      )}

      {/* Suitable Roles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Suitable Roles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suitableRoles.map(
            (role: { role: string; why?: string[] }, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="dc-card p-6 border-l-4 border-green-500"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {role.role}
                </h3>
                <ul className="space-y-2">
                  {role.why?.map((reason, idx) => (
                    <li
                      key={idx}
                      className="flex items-start space-x-2 text-slate-700"
                    >
                      <span className="text-green-500 font-bold mt-1">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ),
          )}
        </div>
      </motion.div>

      {/* Recommended Jobs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-slate-900">
            Recommended Opportunities
          </h2>
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
            {[
              { label: "All", value: "all" },
              { label: "Local", value: "local" },
              { label: "Remote", value: "remote" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setJobMode(item.value as "all" | "local" | "remote")
                }
                className={`px-3 py-2 text-sm ${jobMode === item.value ? "bg-white text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="dc-card p-8 text-center text-slate-600">
            Loading job opportunities...
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="dc-card overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <h3 className="text-lg font-bold">{job.title || job.role}</h3>
                  <p className="text-blue-100">{job.company}</p>
                  {typeof job.fitScore === "number" && (
                    <p className="text-xs text-blue-100 mt-1">
                      Fit Score: {job.fitScore}%
                    </p>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-slate-600 mb-4">{job.description}</p>

                  {job.whyMatch && (
                    <div className="mb-4 bg-blue-50 border border-blue-100 rounded p-3">
                      <h4 className="font-semibold text-blue-900 text-sm mb-1">
                        Why this match
                      </h4>
                      <p className="text-sm text-blue-800">{job.whyMatch}</p>
                    </div>
                  )}

                  {job.requiredSkills && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-slate-900 mb-2">
                        Required Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {job.requiredSkills.map(
                          (skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {job.location && (
                    <p className="text-sm text-slate-600 mb-4">
                      📍 {job.location}
                    </p>
                  )}

                  {(job.salaryBand || job.salaryGapHint) && (
                    <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded p-3">
                      {job.salaryBand && (
                        <p className="text-sm font-semibold text-emerald-900">
                          Salary Band: {job.salaryBand}
                        </p>
                      )}
                      {job.salaryGapHint && (
                        <p className="text-sm text-emerald-800 mt-1">
                          {job.salaryGapHint}
                        </p>
                      )}
                    </div>
                  )}

                  {Array.isArray(job.skillsToUnlock) &&
                    job.skillsToUnlock.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-slate-900 mb-2 text-sm">
                          Skills to unlock next salary bracket
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {job.skillsToUnlock
                            .slice(0, 3)
                            .map((skill: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs"
                              >
                                {skill}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                  <a
                    href={job.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dc-button-primary inline-block px-4 py-2"
                  >
                    View Opportunity
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="dc-card p-6 text-center text-slate-600">
            No job recommendations available yet. Complete an audit to get
            personalized recommendations.
          </div>
        )}
      </motion.div>

      {/* Salary Bracket Gap Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="dc-card p-6 border border-emerald-100"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Salary Bracket Gap Analysis
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Closing these 3 skills can unlock stronger compensation bands.
        </p>
        <div className="flex flex-wrap gap-2">
          {(salaryGapSkills.length > 0
            ? salaryGapSkills
            : ["System design", "Testing strategy", "Security hardening"]
          ).map((skill: string) => (
            <span
              key={skill}
              className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Skills Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="dc-card p-6 border border-blue-200 bg-blue-50"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Your Skills Profile
        </h2>
        <p className="text-slate-700 mb-4">
          Based on your code analysis, we've identified your current skill set
          and areas for growth.
        </p>
        <button className="dc-button-primary px-6 py-2">
          View Skill Roadmap
        </button>
      </motion.div>
    </div>
  );
};
