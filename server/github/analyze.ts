import { githubApiFetch } from "./client.js";
import { cloneRepository } from "./clone.js";
import { analyzeCode } from "../analysis/static.js";
import path from "path";
import { ESLint } from "eslint";
import type { GitHubTarget } from "./parse.js";

export type RepoSignal = {
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  pushedAt?: string;
  updatedAt?: string;
  stars: number;
  forks: number;

  primaryLanguages: string[];

  fileCount?: number;
  topLevelFolders: string[];
  hasTests: boolean;
  hasCI: boolean;
  hasReadme: boolean;
  readmeLength?: number;

  largestFiles: Array<{ path: string; size: number }>;
  staticAnalysis?: ESLint.LintResult[];
};

type GitHubRepo = {
  full_name: string;
  html_url: string;
  default_branch: string;
  pushed_at?: string;
  updated_at?: string;
  stargazers_count: number;
  forks_count: number;
};

type GitHubRepoListItem = GitHubRepo & {
  fork?: boolean;
  archived?: boolean;
};

type GitHubLanguages = Record<string, number>;

type GitHubReadme = {
  content?: string;
  encoding?: string;
};

type GitHubTree = {
  truncated?: boolean;
  tree: Array<{
    path: string;
    type: "blob" | "tree";
    size?: number;
  }>;
};

function topLanguages(languages: GitHubLanguages): string[] {
  const entries = Object.entries(languages);
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 4).map(([name]) => name);
}

function inferLanguagesFromTree(tree: GitHubTree): string[] {
  const extToLang: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".py": "Python",
    ".java": "Java",
    ".kt": "Kotlin",
    ".go": "Go",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".c": "C",
    ".cc": "C++",
    ".cpp": "C++",
    ".cxx": "C++",
    ".h": "C/C++ Header",
    ".hpp": "C/C++ Header",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".md": "Markdown",
    ".json": "JSON",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".toml": "TOML",
    ".xml": "XML",
    ".sh": "Shell",
    ".ps1": "PowerShell",
  };

  const counts = new Map<string, number>();
  for (const item of tree.tree) {
    if (item.type !== "blob") continue;
    const path = item.path.toLowerCase();
    const dot = path.lastIndexOf(".");
    if (dot === -1) continue;
    const ext = path.slice(dot);
    const lang = extToLang[ext];
    if (!lang) continue;
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }

  const entries = Array.from(counts.entries());
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 4).map(([lang]) => lang);
}

function analyzeTree(tree: GitHubTree) {
  const topLevelFolders = new Set<string>();

  let hasTests = false;
  let hasCI = false;

  const largest: Array<{ path: string; size: number }> = [];

  for (const item of tree.tree) {
    const parts = item.path.split("/");
    if (parts[0]) topLevelFolders.add(parts[0]);

    const p = item.path.toLowerCase();
    if (
      p.includes("/__tests__/") ||
      p.startsWith("__tests__/") ||
      p.includes("/test/") ||
      p.startsWith("test/") ||
      p.includes("/tests/") ||
      p.startsWith("tests/") ||
      /\.(test|spec)\.[cm]?[jt]sx?$/.test(p)
    ) {
      hasTests = true;
    }

    if (p.startsWith(".github/workflows/")) {
      hasCI = true;
    }

    if (item.type === "blob" && typeof item.size === "number") {
      largest.push({ path: item.path, size: item.size });
    }
  }

  largest.sort((a, b) => b.size - a.size);

  return {
    fileCount: tree.tree.filter((t) => t.type === "blob").length,
    topLevelFolders: Array.from(topLevelFolders).slice(0, 25),
    hasTests,
    hasCI,
    largestFiles: largest.slice(0, 5),
    truncated: Boolean(tree.truncated),
  };
}

function decodeReadmeLength(readme: GitHubReadme): number | undefined {
  if (!readme.content || readme.encoding !== "base64") return undefined;
  try {
    const text = Buffer.from(readme.content, "base64").toString("utf8");
    return text.trim().length;
  } catch {
    return undefined;
  }
}

export type AnalyzeGitHubOptions = {
  maxRepos?: number;
  maxReposDetailed?: number;
};

export type AnalyzeGitHubResult = {
  repos: RepoSignal[];
  truncated: boolean;
  totalRepos: number;
  detailedRepos: number;
  repoIndex: Array<{
    fullName: string;
    htmlUrl: string;
    pushedAt?: string;
    updatedAt?: string;
  }>;
};

export async function analyzeGitHubTarget(
  target: GitHubTarget,
  options: AnalyzeGitHubOptions = {},
): Promise<AnalyzeGitHubResult> {
  const maxRepos =
    options.maxRepos ?? Number(process.env.GITHUB_MAX_REPOS ?? 50);
  const maxReposDetailed =
    options.maxReposDetailed ??
    Number(process.env.GITHUB_MAX_REPOS_DETAILED ?? 8);

  if (target.kind === "repo") {
    const repo = await analyzeSingleRepo(target.owner, target.repo);
    return {
      repos: [repo],
      truncated: false,
      totalRepos: 1,
      detailedRepos: 1,
      repoIndex: [
        {
          fullName: repo.fullName,
          htmlUrl: repo.htmlUrl,
          pushedAt: repo.pushedAt,
          updatedAt: repo.updatedAt,
        },
      ],
    };
  }

  const all = await listUserReposAll(target.username, maxRepos);
  const filtered = all.filter((r) => !r.archived);
  const truncated = filtered.length > maxRepos;
  const slice = filtered.slice(0, maxRepos);

  const repoIndex = slice.map((r) => ({
    fullName: r.full_name,
    htmlUrl: r.html_url,
    pushedAt: r.pushed_at,
    updatedAt: r.updated_at,
  }));

  const detailedSlice = slice.slice(
    0,
    Math.min(maxReposDetailed, slice.length),
  );
  const repos: RepoSignal[] = [];
  for (const repo of detailedSlice) {
    const [owner, name] = repo.full_name.split("/");
    repos.push(await analyzeSingleRepo(owner, name, repo));
  }

  return {
    repos,
    truncated,
    totalRepos: filtered.length,
    detailedRepos: repos.length,
    repoIndex,
  };
}

async function listUserReposAll(
  username: string,
  cap: number,
): Promise<GitHubRepoListItem[]> {
  const out: GitHubRepoListItem[] = [];
  let page = 1;
  while (out.length < cap) {
    const batch = await githubApiFetch<GitHubRepoListItem[]>(
      `/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&page=${page}`,
    );
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return out;
}

async function analyzeSingleRepo(
  owner: string,
  repo: string,
  preloaded?: GitHubRepo,
): Promise<RepoSignal> {
  const repoInfo =
    preloaded ??
    (await githubApiFetch<GitHubRepo>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    ));

  const [languages, readme, tree] = await Promise.all([
    githubApiFetch<GitHubLanguages>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
    ).catch(() => ({}) as GitHubLanguages),
    githubApiFetch<GitHubReadme>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    ).catch(() => ({}) as GitHubReadme),
    githubApiFetch<GitHubTree>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(
        repoInfo.default_branch,
      )}?recursive=1`,
    ).catch(() => ({ tree: [] }) as GitHubTree),
  ]);

  const readmeLength = decodeReadmeLength(readme);
  const hasReadme =
    typeof readmeLength === "number"
      ? readmeLength > 0
      : Boolean(readme.content);

  const treeSignals = analyzeTree(tree);

  const primaryLanguages = (() => {
    const fromApi = topLanguages(languages);
    if (fromApi.length > 0) return fromApi;
    return inferLanguagesFromTree(tree);
  })();

  return {
    fullName: repoInfo.full_name,
    htmlUrl: repoInfo.html_url,
    defaultBranch: repoInfo.default_branch,
    pushedAt: repoInfo.pushed_at,
    updatedAt: repoInfo.updated_at,
    stars: repoInfo.stargazers_count,
    forks: repoInfo.forks_count,

    primaryLanguages,

    fileCount: treeSignals.fileCount,
    topLevelFolders: treeSignals.topLevelFolders,
    hasTests: treeSignals.hasTests,
    hasCI: treeSignals.hasCI,
    hasReadme,
    readmeLength,

    largestFiles: treeSignals.largestFiles,
  };
}

export async function analyzeRepo(
  target: GitHubTarget,
): Promise<ESLint.LintResult[]> {
  if (target.kind !== "repo") {
    throw new Error("Static repo analysis requires a repository target");
  }

  const repoUrl = `https://github.com/${target.owner}/${target.repo}.git`;
  const localPath = path.resolve(
    process.cwd(),
    "temp-clones",
    target.owner,
    target.repo,
  );
  await cloneRepository(repoUrl, localPath);
  const analysisResults = await analyzeCode(localPath);
  console.log(
    "Static analysis results:",
    JSON.stringify(analysisResults, null, 2),
  );
  return analysisResults;
}
