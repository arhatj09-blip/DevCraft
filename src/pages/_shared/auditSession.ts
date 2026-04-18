const JOB_ID_KEY = 'devskill.audit.jobId'

export function setLastJobId(jobId: string) {
  localStorage.setItem(JOB_ID_KEY, jobId)
}

export function getLastJobId(): string | null {
  return localStorage.getItem(JOB_ID_KEY)
}

export function getJobIdFromUrlOrStorage(): string | null {
  const url = new URL(window.location.href)
  const q = url.searchParams.get('jobId')
  if (q && q.trim()) return q.trim()
  return getLastJobId()
}

export function ensureJobIdInUrl(jobId: string) {
  const url = new URL(window.location.href)
  const existing = url.searchParams.get('jobId')
  if (existing && existing.trim() === jobId) return
  url.searchParams.set('jobId', jobId)
  window.history.replaceState({}, '', url.toString())
}

export function decorateInternalHtmlLinksWithJobId(jobId: string) {
  const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[]

  for (const a of anchors) {
    const raw = a.getAttribute('href')
    if (!raw) continue
    if (raw.startsWith('http:') || raw.startsWith('https:') || raw.startsWith('mailto:') || raw.startsWith('#')) continue

    // Only decorate local HTML navigation (sidebar pages).
    const resolved = new URL(raw, window.location.href)
    const file = resolved.pathname.split('/').pop() ?? ''
    if (!file.endsWith('.html')) continue
    if (file === 'landing_page.html') continue
    if (file === 'register.html' || file === 'login.html') continue

    resolved.searchParams.set('jobId', jobId)

    // Keep links relative so they work in both dev (/src/pages/...) and build (dist/src/pages/...).
    const nextHref = `${file}${resolved.search}${resolved.hash}`
    a.setAttribute('href', nextHref)
  }
}

export function requireJobIdOrRedirect(toHref: string): string {
  const jobId = getJobIdFromUrlOrStorage()
  if (!jobId) {
    window.location.href = toHref
    throw new Error('Missing jobId')
  }
  return jobId
}
