import test from "node:test";
import assert from "node:assert/strict";
import { GitHubApiError, githubApiFetch } from "./client.js";

const originalFetch = globalThis.fetch;
const originalToken = process.env.GITHUB_TOKEN;

function mockFetchOnce(
  implementation: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>,
) {
  (globalThis as { fetch: typeof fetch }).fetch = implementation;
}

test.afterEach(() => {
  (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
  process.env.GITHUB_TOKEN = originalToken;
});

test("githubApiFetch returns parsed JSON on success", async () => {
  mockFetchOnce(async () => {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });

  const result = await githubApiFetch<{ ok: boolean }>("/users/octocat");
  assert.equal(result.ok, true);
});

test("githubApiFetch adds bearer token header when GITHUB_TOKEN is set", async () => {
  process.env.GITHUB_TOKEN = "test-token";
  let authHeader = "";

  mockFetchOnce(async (_input, init) => {
    const headers = new Headers(init?.headers);
    authHeader = headers.get("authorization") ?? "";
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });

  await githubApiFetch<{ ok: boolean }>("/users/octocat");
  assert.equal(authHeader, "Bearer test-token");
});

test("githubApiFetch maps missing user to clear 404 message", async () => {
  mockFetchOnce(async () => {
    return new Response(JSON.stringify({ message: "Not Found" }), {
      status: 404,
    });
  });

  await assert.rejects(
    () => githubApiFetch("/users/unknown-user/repos"),
    (error: unknown) => {
      assert.ok(error instanceof GitHubApiError);
      assert.equal(error.message, "GitHub user not found");
      assert.equal(error.status, 404);
      return true;
    },
  );
});

test("githubApiFetch maps non-user 404 to resource not found", async () => {
  mockFetchOnce(async () => {
    return new Response(JSON.stringify({ message: "Not Found" }), {
      status: 404,
    });
  });

  await assert.rejects(
    () => githubApiFetch("/repos/octocat/does-not-exist"),
    (error: unknown) => {
      assert.ok(error instanceof GitHubApiError);
      assert.equal(error.message, "GitHub resource not found");
      assert.equal(error.status, 404);
      return true;
    },
  );
});

test("githubApiFetch maps 429 to rate limit exceeded", async () => {
  mockFetchOnce(async () => {
    return new Response(
      JSON.stringify({ message: "API rate limit exceeded" }),
      {
        status: 429,
      },
    );
  });

  await assert.rejects(
    () => githubApiFetch("/users/octocat/repos"),
    (error: unknown) => {
      assert.ok(error instanceof GitHubApiError);
      assert.equal(error.message, "GitHub API rate limit exceeded");
      assert.equal(error.status, 429);
      return true;
    },
  );
});

test("githubApiFetch maps 403 with x-ratelimit-remaining=0 to rate limit exceeded", async () => {
  mockFetchOnce(async () => {
    return new Response(JSON.stringify({ message: "Forbidden" }), {
      status: 403,
      headers: {
        "x-ratelimit-remaining": "0",
      },
    });
  });

  await assert.rejects(
    () => githubApiFetch("/users/octocat/repos"),
    (error: unknown) => {
      assert.ok(error instanceof GitHubApiError);
      assert.equal(error.message, "GitHub API rate limit exceeded");
      assert.equal(error.status, 403);
      return true;
    },
  );
});
