export type GitHubTarget =
  | { kind: 'profile'; username: string; url: string }
  | { kind: 'repo'; owner: string; repo: string; url: string }

export function parseGitHubUrl(input: string): GitHubTarget {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('GitHub URL must be a valid URL')
  }

  const host = url.hostname.toLowerCase()
  if (host !== 'github.com' && host !== 'www.github.com') {
    throw new Error('GitHub URL must be a github.com URL')
  }

  const parts = url.pathname
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    throw new Error('GitHub URL path is empty')
  }

  const [first, second] = parts

  if (!second) {
    return { kind: 'profile', username: first, url: `https://github.com/${first}` }
  }

  return {
    kind: 'repo',
    owner: first,
    repo: second.replace(/\.git$/i, ''),
    url: `https://github.com/${first}/${second.replace(/\.git$/i, '')}`,
  }
}
