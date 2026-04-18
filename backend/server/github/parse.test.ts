import test from "node:test";
import assert from "node:assert/strict";
import { parseGitHubUrl } from "./parse.js";

test("parseGitHubUrl extracts profile username", () => {
  const parsed = parseGitHubUrl("https://github.com/octocat");
  assert.equal(parsed.kind, "profile");
  assert.equal(parsed.username, "octocat");
  assert.equal(parsed.url, "https://github.com/octocat");
});

test("parseGitHubUrl normalizes repo URL and strips .git", () => {
  const parsed = parseGitHubUrl("https://github.com/octocat/Hello-World.git");
  assert.equal(parsed.kind, "repo");
  assert.equal(parsed.owner, "octocat");
  assert.equal(parsed.repo, "Hello-World");
  assert.equal(parsed.url, "https://github.com/octocat/Hello-World");
});

test("parseGitHubUrl rejects non-github host", () => {
  assert.throws(
    () => parseGitHubUrl("https://gitlab.com/octocat"),
    /github\.com URL/,
  );
});

test("parseGitHubUrl rejects invalid username segment", () => {
  assert.throws(
    () => parseGitHubUrl("https://github.com/-bad-name"),
    /Invalid GitHub username/,
  );
});

test("parseGitHubUrl rejects empty path", () => {
  assert.throws(() => parseGitHubUrl("https://github.com"), /path is empty/);
});
