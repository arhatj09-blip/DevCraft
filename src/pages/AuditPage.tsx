import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuditStore } from "../store/auditStore";
import { useAuditPolling } from "../hooks/useAudit";

export const AuditPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("jobId");
  const { setJobId, auditJob } = useAuditStore();
  useAuditPolling(jobId);

  useEffect(() => {
    if (jobId) {
      setJobId(jobId);
    }
  }, [jobId, setJobId]);

  // Auto-redirect when audit completes
  useEffect(() => {
    if (auditJob?.status === "completed" && jobId) {
      setTimeout(() => {
        navigate(`/results?jobId=${jobId}`);
      }, 1000);
    }
  }, [auditJob?.status, jobId, navigate]);

  if (!jobId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No audit in progress</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analyzing Your Repository
          </h1>
          <p className="text-gray-600">
            Please wait while we conduct a comprehensive code audit
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {auditJob?.steps?.map((step, index) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Status Indicator */}
                  <div>
                    {step.status === "pending" && (
                      <div className="w-8 h-8 rounded-full border-2 border-gray-300" />
                    )}
                    {step.status === "active" && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent"
                      />
                    )}
                    {step.status === "done" && (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    {step.status === "error" && (
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Step Info */}
                  <div>
                    <h3 className="font-medium text-gray-900">{step.label}</h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {step.status}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm font-medium text-gray-700">
              {auditJob?.progress || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${auditJob?.progress || 0}%` }}
              transition={{ duration: 0.5 }}
              className="bg-blue-600 h-2 rounded-full"
            />
          </div>
        </div>

        {/* Message */}
        {auditJob?.message && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">{auditJob.message}</p>
          </div>
        )}

        {/* Completion Message */}
        {auditJob?.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center"
          >
            <p className="text-green-700 font-medium">
              Audit completed! Redirecting to results...
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
