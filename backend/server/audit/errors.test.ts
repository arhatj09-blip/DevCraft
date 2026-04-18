import test from "node:test";
import assert from "node:assert/strict";
import { GitHubApiError } from "../github/client.js";
import { classifyAuditFailure, resolveAuditFailure } from "./errors.js";

test("classifyAuditFailure maps GitHub rate limit to 429", () => {
  const error = new GitHubApiError(
    "GitHub API rate limit exceeded",
    429,
    "https://api.github.com/users/octocat/repos",
  );

  const result = classifyAuditFailure(error);
  assert.equal(result.code, "RATE_LIMITED");
  assert.equal(result.status, 429);
});

test("classifyAuditFailure maps GitHub not found to 404", () => {
  const error = new GitHubApiError(
    "GitHub user not found",
    404,
    "https://api.github.com/users/missing",
  );

  const result = classifyAuditFailure(error);
  assert.equal(result.code, "GITHUB_NOT_FOUND");
  assert.equal(result.status, 404);
});

test("classifyAuditFailure maps AbortError to upstream timeout", () => {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";

  const result = classifyAuditFailure(error);
  assert.equal(result.code, "UPSTREAM_TIMEOUT");
  assert.equal(result.status, 504);
});

test("resolveAuditFailure maps structured upstream unavailable code", () => {
  const result = resolveAuditFailure({
    message: "External service is temporarily unavailable",
    errorCode: "UPSTREAM_UNAVAILABLE",
  });

  assert.equal(result.code, "UPSTREAM_UNAVAILABLE");
  assert.equal(result.status, 502);
});

test("resolveAuditFailure falls back to legacy rate-limit message parsing", () => {
  const result = resolveAuditFailure({
    message: "GitHub API rate limit exceeded",
  });

  assert.equal(result.code, "RATE_LIMITED");
  assert.equal(result.status, 429);
});
