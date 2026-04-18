export type GitHubTarget =
  | { kind: "profile"; username: string; url: string }
  | { kind: "repo"; owner: string; repo: string; url: string };

const githubUsernamePattern =
  /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

function assertValidUsernameLike(value: string, label: string) {
  if (!githubUsernamePattern.test(value)) {
    throw new Error(`Invalid GitHub ${label}`);
  }
}

export function parseGitHubUrl(input: string): GitHubTarget {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("GitHub URL must be a valid URL");
  }

  const host = url.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    throw new Error("GitHub URL must be a github.com URL");
  }

  const parts = url.pathname
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error("GitHub URL path is empty");
  }

  const [first, second] = parts;
  assertValidUsernameLike(first, "username");

  if (!second) {
    return {
      kind: "profile",
      username: first,
      url: `https://github.com/${first}`,
    };
  }

  const repo = second.replace(/\.git$/i, "");
  if (!repo) {
    throw new Error("Invalid GitHub repository name");
  }

  return {
    kind: "repo",
    owner: first,
    repo,
    url: `https://github.com/${first}/${repo}`,
  };
}
