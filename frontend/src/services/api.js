const RAW_BASE = import.meta.env.DEV
  ? "/api"
  : import.meta.env.VITE_API_URL?.trim() || "/api";
const BASE = RAW_BASE.replace(/\/$/, "");

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = payload?.error?.message || `HTTP ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export const api = {
  health: () => request("/health"),

  signup: ({ email, password, name }) =>
    request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  login: ({ email, password }) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  startAudit: ({ githubUrl, liveAppUrl }) =>
    request("/audit/start", {
      method: "POST",
      body: JSON.stringify({
        githubUrl: githubUrl || undefined,
        liveAppUrl: liveAppUrl || undefined,
      }),
    }),

  getAuditStatus: (jobId) => request(`/audit/${jobId}/status`),
  getAuditResult: (jobId) => request(`/audit/${jobId}/result`),
  getAuditAnalysis: (jobId) => request(`/audit/${jobId}/analysis`),
};
