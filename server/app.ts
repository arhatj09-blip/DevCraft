import express from "express";
import cors from "cors";
import { auditRouter } from "./audit/routes.js";
import { analyzeRouter } from "./analyze/routes.js";
import resumeRouter from "./resume/routes.js";
import { jobsRouter } from "./jobs/routes.js";
import { roadmapRouter } from "./roadmap/routes.js";
import { aiRouter } from "./ai/routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use((req, _res, next) => {
    console.log(`[server] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/audit", auditRouter);
  app.use("/api/analyze", analyzeRouter);
  app.use("/api/resume", resumeRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/roadmap", roadmapRouter);
  app.use("/api/ai", aiRouter);

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `No route for ${req.method} ${req.path}`,
      },
    });
  });

  return app;
}
