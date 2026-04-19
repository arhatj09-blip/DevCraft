import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Audit endpoints
export const auditService = {
  startAudit: (input: {
    githubUrl?: string;
    githubProfileUrl?: string;
    projectUrls?: string[];
    liveAppUrl?: string;
  }) => api.post("/audit/start", input),

  getAuditStatus: (jobId: string) => api.get(`/audit/${jobId}/status`),

  getAuditResult: (jobId: string) => api.get(`/audit/${jobId}/result`),

  getCollection: (jobId: string) => api.get(`/audit/${jobId}/collection`),

  getAnalysis: (jobId: string) => api.get(`/audit/${jobId}/analysis`),

  getDiagnostic: (jobId: string) => api.get(`/audit/${jobId}/diagnostic`),

  getHistory: (limit = 30) => api.get(`/audit/history?limit=${limit}`),

  getShareLink: (jobId: string) => api.get(`/audit/${jobId}/share`),

  downloadPdf: (jobId: string) =>
    api.get(`/audit/${jobId}/pdf`, { responseType: "blob" }),
};

// Jobs endpoints
export const jobsService = {
  getJobs: (jobId: string, mode?: "all" | "local" | "remote") =>
    api.get(
      `/jobs?jobId=${jobId}${mode && mode !== "all" ? `&mode=${mode}` : ""}`,
    ),
};

// Resume endpoints
export const resumeService = {
  optimize: (jobId: string) => api.get(`/resume/optimize?jobId=${jobId}`),
};

// Roadmap endpoints
export const roadmapService = {
  getRoadmap: (jobId: string) => api.get(`/roadmap?jobId=${jobId}`),
};

export const aiService = {
  chat: (jobId: string, message: string) =>
    api.post("/ai/chat", {
      jobId,
      message,
    }),
};

// Error handler
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error("API Error:", error.message);
    return Promise.reject(error);
  },
);

export default api;
