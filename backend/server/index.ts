import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createApp } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendEnvPath = path.resolve(__dirname, "..", ".env");
const rootEnvPath = path.resolve(__dirname, "..", "..", ".env");
const frontendDistPath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "dist",
);

// Prefer backend/.env to keep API config isolated; fallback to root .env.
dotenv.config({
  path: backendEnvPath,
  override: true,
});

dotenv.config({
  path: rootEnvPath,
  override: false,
});

const port = Number(process.env.PORT ?? 8787);
const app = createApp({ frontendDistPath });

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
