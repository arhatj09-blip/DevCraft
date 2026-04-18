export type LiveAppAnalysis = {
  url: string
  loadTimeMs?: number
  performanceScore?: number
  accessibilityScore?: number
  notes: string[]
}

function scoreFromLoadTime(loadTimeMs: number): number {
  if (loadTimeMs <= 800) return 95
  if (loadTimeMs <= 2000) {
    const t = (loadTimeMs - 800) / (2000 - 800)
    return Math.round(95 - t * 30)
  }
  if (loadTimeMs <= 5000) {
    const t = (loadTimeMs - 2000) / (5000 - 2000)
    return Math.round(65 - t * 45)
  }
  return 10
}

export async function analyzeLiveApp(url: string): Promise<LiveAppAnalysis> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  const notes: string[] = []
  const started = Date.now()

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'DevSkill-Audit/0.1',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const loadTimeMs = Date.now() - started

    if (!res.ok) {
      notes.push(`HTTP ${res.status} when fetching live app`) 
      return {
        url,
        loadTimeMs,
        performanceScore: scoreFromLoadTime(loadTimeMs),
        accessibilityScore: undefined,
        notes,
      }
    }

    // Read up to ~400KB to avoid huge downloads.
    const reader = res.body?.getReader()
    let totalBytes = 0
    const chunks: Uint8Array[] = []
    if (reader) {
      while (totalBytes < 400_000) {
        const { done, value } = await reader.read()
        if (done || !value) break
        totalBytes += value.byteLength
        chunks.push(value)
      }
      try {
        reader.releaseLock()
      } catch {
        // ignore
      }
    }

    let html = ''
    try {
      html = Buffer.concat(chunks).toString('utf8')
    } catch {
      html = ''
    }

    const lower = html.toLowerCase()
    const hasLang = /<html[^>]*\slang=/.test(lower)
    const hasViewport = /<meta[^>]*name=["']viewport["']/.test(lower)
    const imgTags = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((m) => m[0])
    const imgCount = imgTags.length
    const imgWithAlt = imgTags.filter((t) => /\salt=/.test(t.toLowerCase())).length
    const ariaLabelCount = (html.match(/aria-label=/gi) ?? []).length

    let accessibilityScore = 40
    if (hasLang) accessibilityScore += 20
    else notes.push('Accessibility: missing <html lang=...> signal.')

    if (hasViewport) accessibilityScore += 15
    else notes.push('Accessibility/UX: missing meta viewport signal (mobile).')

    if (imgCount > 0) {
      const ratio = imgWithAlt / imgCount
      accessibilityScore += Math.round(ratio * 25)
      if (ratio < 0.7) notes.push('Accessibility: many <img> tags lack alt text (rough heuristic).')
    } else {
      accessibilityScore += 10
    }

    if (ariaLabelCount > 0) accessibilityScore += 10
    accessibilityScore = Math.max(0, Math.min(100, accessibilityScore))

    notes.push('Performance score is an estimate based on fetch time (not Lighthouse).')
    notes.push('Accessibility score is a lightweight HTML heuristic (not Lighthouse).')
    notes.push('UI/UX and interaction smoothness require browser-based auditing (not run on server).')

    return {
      url,
      loadTimeMs,
      performanceScore: scoreFromLoadTime(loadTimeMs),
      accessibilityScore,
      notes,
    }
  } catch {
    const loadTimeMs = Date.now() - started
    notes.push('Failed to fetch live app URL.')

    return {
      url,
      loadTimeMs,
      performanceScore: scoreFromLoadTime(loadTimeMs),
      accessibilityScore: undefined,
      notes,
    }
  } finally {
    clearTimeout(timeout)
  }
}
