export type ApiErrorShape = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

async function parseJsonSafe(resp: Response): Promise<unknown> {
  const text = await resp.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(path, {
    method: 'GET',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  })
  const json = await parseJsonSafe(resp)
  if (!resp.ok) {
    const msg =
      typeof json === 'object' && json && 'error' in json
        ? (json as ApiErrorShape).error?.message
        : undefined
    throw new Error(msg ?? `GET ${path} failed (${resp.status})`)
  }
  return json as T
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await parseJsonSafe(resp)
  if (!resp.ok) {
    const msg =
      typeof json === 'object' && json && 'error' in json
        ? (json as ApiErrorShape).error?.message
        : undefined
    throw new Error(msg ?? `POST ${path} failed (${resp.status})`)
  }
  return json as T
}
