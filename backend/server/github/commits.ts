import { githubApiFetch } from './client.js'

export type CommitSampleCommit = {
  sha: string
  title: string
  date?: string
}

export type CommitSample = {
  sampleSize: number
  latestCommitAt?: string
  oldestCommitAt?: string
  commits: CommitSampleCommit[]
}

type GitHubCommit = {
  sha?: string
  commit?: {
    message?: string
    author?: { date?: string }
    committer?: { date?: string }
  }
}

function extractDate(c: GitHubCommit): string | undefined {
  return c.commit?.committer?.date ?? c.commit?.author?.date
}

function extractTitle(message: string | undefined): string {
  const firstLine = (message ?? '').split(/\r?\n/)[0]?.trim() ?? ''
  if (!firstLine) return '(no message)'
  const max = 80
  return firstLine.length > max ? `${firstLine.slice(0, max - 1)}…` : firstLine
}

export async function fetchCommitSample(owner: string, repo: string): Promise<CommitSample> {
  const commits = await githubApiFetch<GitHubCommit[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=60`,
  )

  const dates = commits.map(extractDate).filter(Boolean) as string[]
  dates.sort((a, b) => Date.parse(b) - Date.parse(a))

  const commitList: CommitSampleCommit[] = commits
    .map((c) => ({
      sha: c.sha ?? '',
      title: extractTitle(c.commit?.message),
      date: extractDate(c),
    }))
    .filter((c) => Boolean(c.sha) && Boolean(c.date))

  return {
    sampleSize: commits.length,
    latestCommitAt: dates[0],
    oldestCommitAt: dates[dates.length - 1],
    commits: commitList,
  }
}
