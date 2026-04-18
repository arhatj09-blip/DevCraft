type GitHubErrorPayload = {
  message?: string
  documentation_url?: string
}

export type GitHubFetchOptions = {
  token?: string
  timeoutMs?: number
}

export async function githubApiFetch<T>(
  path: string,
  options: GitHubFetchOptions = {},
): Promise<T> {
  const token = options.token ?? process.env.GITHUB_TOKEN
  const timeoutMs = options.timeoutMs ?? 12_000

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`https://api.github.com${path}`, {
      method: 'GET',
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'DevSkill-Audit/0.1',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      let body: GitHubErrorPayload | undefined
      try {
        body = (await res.json()) as GitHubErrorPayload
      } catch {
        body = undefined
      }

      const message = body?.message ?? `GitHub API error (${res.status})`
      const extra = body?.documentation_url ? ` (${body.documentation_url})` : ''
      throw new Error(`${message}${extra}`)
    }

    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}
