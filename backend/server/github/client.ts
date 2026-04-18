type GitHubErrorPayload = {
  message?: string;
  documentation_url?: string;
};

export class GitHubApiError extends Error {
  status: number;
  url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.url = url;
  }
}

export type GitHubFetchOptions = {
  token?: string;
  timeoutMs?: number;
};

function resolveGitHubApiToken(explicit?: string): string | undefined {
  const candidates = [
    explicit,
    process.env.GITHUB_TOKEN,
    process.env.GITHUB_API_TOKEN,
    process.env.GH_TOKEN,
  ];

  for (const candidate of candidates) {
    const token = candidate?.trim();
    if (token) return token;
  }

  return undefined;
}

export async function githubApiFetch<T>(
  path: string,
  options: GitHubFetchOptions = {},
): Promise<T> {
  const token = resolveGitHubApiToken(options.token);
  const timeoutMs = options.timeoutMs ?? 12_000;
  const apiUrl = `https://api.github.com${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.info(`[github] GET ${apiUrl}`);
    if (!token) {
      console.warn("GitHub token not found");
    }

    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "DevSkill-Audit/0.1",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });

    const rateLimit = res.headers.get("x-ratelimit-limit");
    const rateRemaining = res.headers.get("x-ratelimit-remaining");
    const rateReset = res.headers.get("x-ratelimit-reset");

    console.info(`[github] status=${res.status} url=${apiUrl}`);
    console.info(
      `[github] rate-limit limit=${rateLimit ?? "unknown"} remaining=${rateRemaining ?? "unknown"} reset=${rateReset ?? "unknown"}`,
    );

    if (token) {
      console.info(
        `[github] token active; remaining requests: ${rateRemaining ?? "unknown"}`,
      );
    }

    if (!res.ok) {
      let body: GitHubErrorPayload | undefined;
      try {
        body = (await res.json()) as GitHubErrorPayload;
      } catch {
        body = undefined;
      }

      const rawMessage = body?.message?.toLowerCase() ?? "";
      const isRateLimited =
        res.status === 429 ||
        (res.status === 403 &&
          res.headers.get("x-ratelimit-remaining") === "0") ||
        rawMessage.includes("rate limit");

      if (isRateLimited) {
        throw new GitHubApiError(
          "GitHub API rate limit exceeded",
          res.status,
          apiUrl,
        );
      }

      if (res.status === 404) {
        if (/\/users\/[^/]+\/repos/i.test(path) || /\/users\//i.test(path)) {
          throw new GitHubApiError("GitHub user not found", res.status, apiUrl);
        }

        throw new GitHubApiError(
          "GitHub resource not found",
          res.status,
          apiUrl,
        );
      }

      const message = body?.message ?? `GitHub API error (${res.status})`;
      const extra = body?.documentation_url
        ? ` (${body.documentation_url})`
        : "";
      throw new GitHubApiError(`${message}${extra}`, res.status, apiUrl);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
