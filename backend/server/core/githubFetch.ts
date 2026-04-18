import { githubApiFetch } from '../github/client.js'

type GitHubTree = {
  truncated?: boolean
  tree: Array<{
    path: string
    type: 'blob' | 'tree'
    size?: number
  }>
}

type GitHubContentFile = {
  type?: 'file'
  encoding?: string
  content?: string
  size?: number
  path?: string
}

export async function fetchRepoTree(owner: string, repo: string, ref: string): Promise<GitHubTree> {
  return githubApiFetch<GitHubTree>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(
      ref,
    )}?recursive=1`,
  )
}

export async function fetchRepoTextFile(options: {
  owner: string
  repo: string
  path: string
  ref: string
  maxBytes: number
}): Promise<{ text: string; truncated: boolean } | null> {
  const { owner, repo, path, ref, maxBytes } = options

  // The contents API returns base64 for small-ish files. If the file is too large,
  // GitHub may omit content. We treat that as not fetchable.
  const data = await githubApiFetch<GitHubContentFile>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(
      path,
    )}?ref=${encodeURIComponent(ref)}`,
  )

  if (data?.type !== 'file') return null
  if (typeof data.size === 'number' && data.size > maxBytes) return null
  if (!data.content || data.encoding !== 'base64') return null

  try {
    const buf = Buffer.from(data.content, 'base64')
    if (buf.byteLength > maxBytes) return null
    return { text: buf.toString('utf8'), truncated: false }
  } catch {
    return null
  }
}
