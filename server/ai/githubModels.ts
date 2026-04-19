import OpenAI from "openai";

const GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com";

export type GitHubModelsChatResult = {
  modelUsed: string;
  cached: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  response: unknown;
};

const DEFAULT_MODELS = ["gpt-4o", "gpt-4o-mini"];

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { status?: number; code?: string; message?: string };
  if (anyErr.status === 429) return true;
  if (anyErr.code && anyErr.code.toLowerCase().includes("rate")) return true;
  if (anyErr.message && anyErr.message.toLowerCase().includes("rate"))
    return true;
  return false;
}

function isModelNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { status?: number; code?: string; message?: string };
  if (anyErr.status === 404) return true;
  if (anyErr.code && anyErr.code.toLowerCase().includes("model")) return true;
  if (
    anyErr.message &&
    anyErr.message.toLowerCase().includes("model") &&
    anyErr.message.toLowerCase().includes("not found")
  )
    return true;
  return false;
}

function getModelCandidates(): string[] {
  const raw = process.env.GITHUB_MODELS?.trim();
  if (!raw) return DEFAULT_MODELS;

  const models = raw
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  if (models.length === 0) return DEFAULT_MODELS;
  return Array.from(new Set(models));
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    return JSON.parse(slice);
  }

  throw new Error("Model response was not JSON");
}

export async function callGitHubModelsJson(args: {
  model: string;
  system: string;
  userJson: unknown;
}): Promise<{
  modelUsed: string;
  usage?: GitHubModelsChatResult["usage"];
  response: unknown;
}> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required for GitHub Models (AI) calls");
  }

  const client = new OpenAI({
    apiKey: token,
    baseURL: GITHUB_MODELS_BASE_URL,
  });

  const resp = await client.chat.completions.create({
    model: args.model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: JSON.stringify(args.userJson) },
    ],
  });

  const modelUsed = resp.model ?? args.model;
  const usage = resp.usage
    ? {
        promptTokens: resp.usage.prompt_tokens,
        completionTokens: resp.usage.completion_tokens,
        totalTokens: resp.usage.total_tokens,
      }
    : undefined;

  const content = resp.choices?.[0]?.message?.content ?? "";
  const parsed = extractJsonObject(content);

  return { modelUsed, usage, response: parsed };
}

export async function callWithFallback(args: {
  system: string;
  userJson: unknown;
}): Promise<{
  modelUsed: string;
  usage?: GitHubModelsChatResult["usage"];
  response: unknown;
}> {
  const modelCandidates = getModelCandidates();
  let lastError: unknown;

  for (const model of modelCandidates) {
    try {
      return await callGitHubModelsJson({
        model,
        system: args.system,
        userJson: args.userJson,
      });
    } catch (e) {
      lastError = e;
      if (!isRateLimitError(e) && !isModelNotFoundError(e)) throw e;
    }
  }

  const modelList = modelCandidates.join(", ");
  const reason =
    lastError instanceof Error ? lastError.message : "unknown error";
  throw new Error(
    `All configured models failed (${modelList}). Last error: ${reason}`,
  );
}
