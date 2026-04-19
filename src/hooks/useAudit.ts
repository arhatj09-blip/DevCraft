import { useEffect, useState } from "react";
import { useAuditStore } from "../store/auditStore";
import {
  auditService,
  jobsService,
  resumeService,
  roadmapService,
} from "../services/api";

export const useAuditPolling = (jobId: string | null) => {
  const { setAuditJob, setAuditReport } = useAuditStore();
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const statusResponse = await auditService.getAuditStatus(jobId);
        const statusData = statusResponse.data;

        setAuditJob(statusData);

        if (statusData.status === "completed") {
          const resultResponse = await auditService.getAuditResult(jobId);
          setAuditReport(resultResponse.data);
          setIsPolling(false);
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 850);

    return () => clearInterval(interval);
  }, [jobId, setAuditJob, setAuditReport]);

  return isPolling;
};

export const useFetchAuditData = (jobId: string | null) => {
  const { setCollection, setAnalysis, setAuditReport } = useAuditStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [resultRes, collectionRes, analysisRes] = await Promise.all([
          auditService.getAuditResult(jobId).catch(() => null),
          auditService.getCollection(jobId).catch(() => null),
          auditService.getAnalysis(jobId).catch(() => null),
        ]);

        if (resultRes?.data) setAuditReport(resultRes.data);
        if (collectionRes?.data) setCollection(collectionRes.data);
        if (analysisRes?.data) setAnalysis(analysisRes.data);
      } catch (error) {
        console.error("Data fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, setCollection, setAnalysis, setAuditReport]);

  return loading;
};

export const useFetchJobs = (
  jobId: string | null,
  mode: "all" | "local" | "remote" = "all",
) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await jobsService.getJobs(jobId, mode);
        setJobs(response.data);
      } catch (error) {
        console.error("Jobs fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [jobId, mode]);

  return { jobs, loading };
};

export const useFetchRoadmap = (jobId: string | null) => {
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const fetchRoadmap = async () => {
      setLoading(true);
      try {
        const response = await roadmapService.getRoadmap(jobId);
        setRoadmap(response.data);
      } catch (error) {
        console.error("Roadmap fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [jobId]);

  return { roadmap, loading };
};

export const useFetchResumeInsights = (jobId: string | null) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const fetchInsights = async () => {
      setLoading(true);
      try {
        const response = await resumeService.optimize(jobId);
        setInsights(response.data);
      } catch (error) {
        console.error("Resume insights fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [jobId]);

  return { insights, loading };
};
