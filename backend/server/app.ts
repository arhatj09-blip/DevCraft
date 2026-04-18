import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { auditRouter } from "./audit/routes.js";
import { analyzeRouter } from "./analyze/routes.js";
import { authRouter } from "./auth/routes.js";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:5178",
  "http://127.0.0.1:5178",
];

function isLocalDevOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const isLocalHost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const port = Number(parsed.port || 0);
    const isFrontendDevPort =
      Number.isFinite(port) && port >= 5173 && port <= 5199;
    return isLocalHost && isFrontendDevPort;
  } catch {
    return false;
  }
}

type CreateAppOptions = {
  frontendDistPath?: string;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const envOrigins = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowedOrigins = new Set([...defaultAllowedOrigins, ...envOrigins]);
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.options("/{*path}", cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));

  app.use((err, _req, res, next) => {
    if (
      err &&
      typeof err === "object" &&
      "type" in err &&
      err.type === "entity.parse.failed"
    ) {
      return res.status(400).json({
        error: {
          code: "BAD_JSON",
          message: "Malformed JSON request body",
        },
      });
    }
    return next(err);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/audit", auditRouter);
  app.use("/api/analyze", analyzeRouter);
  app.use("/api/auth", authRouter);

  app.use("/api", (req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `No route for ${req.method} ${req.path}`,
      },
    });
  });

  const frontendDistPath = options.frontendDistPath;
  const indexHtmlPath = frontendDistPath
    ? path.join(frontendDistPath, "index.html")
    : "";

  if (frontendDistPath && fs.existsSync(indexHtmlPath)) {
    const assetsDistPath = path.join(frontendDistPath, "assets");

    // Serve hashed Vite assets first and fail with 404 if missing.
    if (fs.existsSync(assetsDistPath)) {
      app.use(
        "/assets",
        express.static(assetsDistPath, {
          fallthrough: false,
          immutable: true,
          maxAge: "1y",
        }),
      );
    }

    // Serve remaining static files from the frontend build output.
    app.use(
      express.static(frontendDistPath, {
        index: false,
      }),
    );

    app.get("/{*path}", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }

      // Do not return index.html for file-like requests (css/js/etc).
      if (path.extname(req.path)) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: `Asset not found: ${req.path}`,
          },
        });
      }

      return res.sendFile(indexHtmlPath);
    });
  }

  app.use((err, req, res, next) => {
    const messageFromError =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message || "")
        : "";

    const isCorsError = messageFromError
      .toLowerCase()
      .includes("cors origin not allowed");
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? Number((err as { status?: number }).status)
        : typeof (err as { statusCode?: unknown })?.statusCode === "number"
          ? Number((err as { statusCode?: number }).statusCode)
          : isCorsError
            ? 403
            : 500;

    const code = isCorsError
      ? "CORS_BLOCKED"
      : status >= 500
        ? "INTERNAL_ERROR"
        : "REQUEST_FAILED";

    const message = isCorsError
      ? "Request origin is not allowed by CORS policy"
      : status >= 500
        ? "Unexpected server error"
        : messageFromError || "Request failed";

    if (status >= 500) {
      console.error(`[error] ${req.method} ${req.path}:`, err);
    }

    if (res.headersSent) {
      return next(err);
    }

    res.status(status).json({
      error: {
        code,
        message,
      },
    });
  });

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

