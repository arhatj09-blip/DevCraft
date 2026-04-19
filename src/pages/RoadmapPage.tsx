import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useFetchAuditData, useFetchRoadmap } from "../hooks/useAudit";
import { useAuditStore } from "../store/auditStore";

const priorityWidthClass = (index: number): string => {
  const percent = Math.min((index + 1) * 20, 100);
  if (percent >= 100) return "w-full";
  if (percent >= 80) return "w-4/5";
  if (percent >= 60) return "w-3/5";
  if (percent >= 40) return "w-2/5";
  return "w-1/5";
};

export const RoadmapPage = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const { auditReport } = useAuditStore();
  const auditLoading = useFetchAuditData(jobId);
  const { loading } = useFetchRoadmap(jobId);

  if (!jobId) {
    return (
      <div className="dc-card p-8 text-center text-slate-600">
        No audit data available
      </div>
    );
  }

  const ai = auditReport?.ai?.response;
  const currentSkills = ai?.skillMap?.coreStrengths || [];
  const recommendedSkills =
    ai?.skillGapAnalysis?.map((g: { gap: string }) => g.gap) || [];
  const roadmapWeeks = ai?.roadmapWeeks || [];

  if ((auditLoading || loading) && !auditReport) {
    return (
      <div className="dc-card p-8 text-center text-slate-600">
        Loading roadmap...
      </div>
    );
  }

  // Prepare data for chart
  const chartData = [
    {
      name: "Current Skills",
      count: currentSkills.length,
    },
    {
      name: "Recommended Skills",
      count: recommendedSkills.length,
    },
  ];

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dc-card p-8"
      >
        <h1 className="text-3xl font-bold mb-2 text-slate-900">
          Your Skill Roadmap
        </h1>
        <p className="text-slate-600">
          Personalized learning path based on your analysis.
        </p>
      </motion.div>

      {/* Current Skills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="dc-card p-6"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Current Skills
        </h2>
        <div className="flex flex-wrap gap-3">
          {currentSkills.map((skill, index) => (
            <motion.div
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="dc-chip"
            >
              {skill}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Skills Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="dc-card p-6"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Skills Overview
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recommended Skills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Recommended Skills to Learn
        </h2>
        <div className="space-y-3">
          {recommendedSkills.map((skill, index) => (
            <motion.div
              key={skill}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="dc-card p-4 border-l-4 border-green-500"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{skill}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Recommended priority:{" "}
                    {index === 0 ? "High" : index === 1 ? "High" : "Medium"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {(index + 1) * 20}%
                  </div>
                  <p className="text-xs text-slate-500">Priority</p>
                </div>
              </div>
              <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`bg-green-500 h-2 rounded-full ${priorityWidthClass(index)}`}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Estimated learning time:{" "}
                {index === 0
                  ? "2-3 months"
                  : index === 1
                    ? "2-3 months"
                    : "1-2 months"}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Learning Path Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="dc-card p-6"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Learning Timeline
        </h2>

        {/* Timeline */}
        <div className="space-y-4">
          {roadmapWeeks.length > 0
            ? roadmapWeeks
                .slice(0, 4)
                .map(
                  (
                    item: { weekRange: string; actions: string[] },
                    index: number,
                  ) => (
                    <div
                      key={item.weekRange}
                      className="flex items-start space-x-4"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        {index < 3 && (
                          <div className="w-1 h-12 bg-blue-300 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <h3 className="font-bold text-slate-900">
                          {item.weekRange}
                        </h3>
                        <p className="text-slate-600">
                          {item.actions?.[0] ||
                            "Complete recommended roadmap steps."}
                        </p>
                      </div>
                    </div>
                  ),
                )
            : ["Month 1-2", "Month 2-3", "Month 3-6", "Month 6-12"].map(
                (period, index) => (
                  <div key={period} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      {index < 3 && (
                        <div className="w-1 h-12 bg-blue-300 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pt-2">
                      <h3 className="font-bold text-slate-900">{period}</h3>
                      <p className="text-slate-600">
                        {index === 0 &&
                          "Master the fundamentals and core concepts"}
                        {index === 1 &&
                          "Build practical projects and gain hands-on experience"}
                        {index === 2 &&
                          "Advance your skills with complex projects"}
                        {index === 3 && "Achieve expertise and mentor others"}
                      </p>
                    </div>
                  </div>
                ),
              )}
        </div>
      </motion.div>

      {/* Action Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="dc-card p-6 border border-purple-200 bg-purple-50"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Quick Start Actions
        </h2>
        <ul className="space-y-2 text-slate-700">
          <li className="flex items-start space-x-3">
            <span className="text-purple-600 font-bold">✓</span>
            <span>
              Start with the recommended skills to fill immediate gaps
            </span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-purple-600 font-bold">✓</span>
            <span>Build 2-3 projects using your new skills</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-purple-600 font-bold">✓</span>
            <span>Contribute to open-source projects</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-purple-600 font-bold">✓</span>
            <span>Join communities and network with professionals</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
};
