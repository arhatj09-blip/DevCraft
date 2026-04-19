import { create } from "zustand";

export interface AuditStep {
  key: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
}

export interface AuditJob {
  jobId: string;
  status: "running" | "completed" | "failed";
  progress: number;
  steps: AuditStep[];
  message: string;
}

export interface AuditReport {
  summary: {
    score: number;
    label: string;
    level: string;
    verdict: string;
  };
  projects: Array<{
    name: string;
    url: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    issues: Array<{
      title: string;
      severity: string;
      category: string;
      ruleId: string;
      example: string;
    }>;
  }>;
  careerInsights?: {
    suitableRoles: Array<{ role: string; why: string[] }>;
    notReadyFor: Array<{ role: string; why: string[] }>;
  };
  ai?: {
    modelUsed: string;
    response: {
      summary?: string;
      brutallyHonestSummary?: string;
      levelEstimate?: {
        level: string;
        percentile: number;
        reasoning?: string[];
      };
      skillMap?: {
        coreStrengths: string[];
        criticalWeaknesses: string[];
      };
      skillGapAnalysis?: Array<{
        gap: string;
        whyBlocksProgression: string;
        evidenceExamples?: string[];
      }>;
      roadmapWeeks?: Array<{
        weekRange: string;
        actions: string[];
      }>;
      roleReadiness?: {
        ready: Array<{ role: string; why: string[] }>;
        notReady: Array<{ role: string; why: string[] }>;
      };
      careerInsights?: {
        suitableRoles: Array<{ role: string; why: string[] }>;
      };
      resumeInsights?: {
        highlightTheseProjects: Array<{ name: string; reason: string }>;
      };
      skillRoadmap?: {
        currentSkills: string[];
        recommendedNext: string[];
      };
    };
  };
}

interface AuditStore {
  jobId: string | null;
  auditJob: AuditJob | null;
  auditReport: AuditReport | null;
  collection: any | null;
  analysis: any | null;

  setJobId: (jobId: string) => void;
  setAuditJob: (job: AuditJob) => void;
  setAuditReport: (report: AuditReport) => void;
  setCollection: (collection: any) => void;
  setAnalysis: (analysis: any) => void;
  reset: () => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  jobId: localStorage.getItem("devskill.audit.jobId") || null,
  auditJob: null,
  auditReport: null,
  collection: null,
  analysis: null,

  setJobId: (jobId: string) => {
    localStorage.setItem("devskill.audit.jobId", jobId);
    set({ jobId });
  },

  setAuditJob: (job: AuditJob) => set({ auditJob: job }),
  setAuditReport: (report: AuditReport) => set({ auditReport: report }),
  setCollection: (collection: any) => set({ collection }),
  setAnalysis: (analysis: any) => set({ analysis }),

  reset: () => {
    localStorage.removeItem("devskill.audit.jobId");
    set({
      jobId: null,
      auditJob: null,
      auditReport: null,
      collection: null,
      analysis: null,
    });
  },
}));
