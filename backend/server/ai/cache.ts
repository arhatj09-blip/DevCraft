export type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.value as T
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function clearExpiredCache() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now >= entry.expiresAt) cache.delete(key)
  }
}
