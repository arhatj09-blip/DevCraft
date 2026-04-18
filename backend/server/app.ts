import express from "express";
import cors from "cors";
import { auditRouter } from "./audit/routes.js";
import { analyzeRouter } from "./analyze/routes.js";
import { authRouter } from "./auth/routes.js";

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5177",
  "http://127.0.0.1:5177",
];

const envOrigins = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...envOrigins]);

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin not allowed: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/audit", auditRouter);
  app.use("/api/analyze", analyzeRouter);
  app.use("/api/auth", authRouter);

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
