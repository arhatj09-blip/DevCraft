import { apiGet } from './_shared/api'
import {
  decorateInternalHtmlLinksWithJobId,
  ensureJobIdInUrl,
  requireJobIdOrRedirect,
  setLastJobId,
} from './_shared/auditSession'
import { escapeHtml, setHtml, setText } from './_shared/dom'

type AuditReport = {
  resumeInsights?: {
    highlightTheseProjects: Array<{ name: string; reason: string }>
    improveOrRemove: Array<{ name: string; reason: string }>
    bulletRewrite: Array<{ before: string; after: string }>
  }
  ai?: { modelUsed?: string; response: any }
}

type ProjectItem = { title: string; keywords?: string[]; matchPct?: number; hint?: string }

type BulletLabItem = { before: string; after: string }

function normalizeProjectItems(value: unknown): ProjectItem[] {
  if (!value) return []
  if (!Array.isArray(value)) return []

  return value
    .map((v) => {
      if (typeof v === 'string') return { title: v }
      if (v && typeof v === 'object') {
        const obj: any = v
        const title = obj.title ?? obj.name ?? obj.project
        if (typeof title !== 'string') return null
        const keywords = Array.isArray(obj.keywords) ? obj.keywords.filter((k: any) => typeof k === 'string') : undefined
        const matchPct = typeof obj.matchPct === 'number' ? obj.matchPct : typeof obj.match === 'number' ? obj.match : undefined
        const hint = typeof obj.hint === 'string' ? obj.hint : typeof obj.action === 'string' ? obj.action : undefined
        return { title, keywords, matchPct, hint }
      }
      return null
    })
    .filter(Boolean) as ProjectItem[]
}

function renderHighImpact(items: ProjectItem[]): string {
  const top = items.slice(0, 3)
  return top
    .map((p) => {
      const keywords = p.keywords?.length ? `Keywords: ${p.keywords.join(', ')}` : ''
      const pct = typeof p.matchPct === 'number' ? `${Math.round(p.matchPct)}% Match` : ''
      const hint = p.hint ? escapeHtml(p.hint) : 'Keep at top'

      return `
        <div class="flex items-center justify-between p-4 bg-surface rounded-lg border border-outline-variant/15">
          <div class="flex flex-col gap-1">
            <span class="font-semibold text-on-surface">${escapeHtml(p.title)}</span>
            <span class="text-xs text-on-surface-variant">${escapeHtml(keywords)}</span>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="text-sm font-bold text-primary">${escapeHtml(pct)}</span>
            <span class="text-xs font-semibold text-primary bg-primary-fixed/40 px-3 py-1.5 rounded-lg border border-primary-fixed/60 shadow-sm">${hint}</span>
          </div>
        </div>
      `
    })
    .join('')
}

function renderOptimization(items: ProjectItem[]): string {
  const top = items.slice(0, 3)
  return top
    .map((p) => {
      const hint = p.hint ?? 'Add impact metrics (latency, throughput, users, cost).' 
      return `
        <div class="flex flex-col gap-2 p-4 bg-surface rounded-lg border border-outline-variant/15">
          <span class="font-semibold text-on-surface text-sm">${escapeHtml(p.title)}</span>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-tertiary text-[16px]">warning</span>
            <span class="text-xs text-on-surface-variant">${escapeHtml(hint)}</span>
          </div>
        </div>
      `
    })
    .join('')
}

function normalizeBulletLab(value: unknown): BulletLabItem[] {
  if (!value) return []
  if (!Array.isArray(value)) return []

  return value
    .map((v) => {
      if (!v || typeof v !== 'object') return null
      const obj: any = v
      const before = obj.before ?? obj.currentDraft
      const after = obj.after ?? obj.optimizedRewrite
      if (typeof before === 'string' && typeof after === 'string') return { before, after }
      return null
    })
    .filter(Boolean) as BulletLabItem[]
}

async function run() {
  const jobId = requireJobIdOrRedirect('landing_page.html')
  setLastJobId(jobId)
  ensureJobIdInUrl(jobId)
  decorateInternalHtmlLinksWithJobId(jobId)

  const report = await apiGet<AuditReport>(`/api/audit/${encodeURIComponent(jobId)}/result`)
  const ai = report.ai?.response
  const aiUnavailable = report.ai?.modelUsed === 'unavailable'

  // Prefer non-AI report outputs (always present). Use AI only if available.
  const highImpactFromReport: ProjectItem[] = (report.resumeInsights?.highlightTheseProjects ?? []).map((p) => ({
    title: p.name,
    hint: p.reason,
  }))

  const optimizationFromReport: ProjectItem[] = (report.resumeInsights?.improveOrRemove ?? []).map((p) => ({
    title: p.name,
    hint: p.reason,
  }))

  const bulletsFromReport: BulletLabItem[] = (report.resumeInsights?.bulletRewrite ?? []).map((b) => ({
    before: b.before,
    after: b.after,
  }))

  const highImpact =
    (highImpactFromReport.length ? highImpactFromReport : undefined) ||
    normalizeProjectItems(ai?.resumeInsights?.highImpactProjects) ||
    normalizeProjectItems(ai?.resumeInsights?.projectStrategy?.highImpact) ||
    normalizeProjectItems(ai?.resume?.highImpactProjects)

  const optimization =
    (optimizationFromReport.length ? optimizationFromReport : undefined) ||
    normalizeProjectItems(ai?.resumeInsights?.optimizationNeeded) ||
    normalizeProjectItems(ai?.resumeInsights?.projectStrategy?.optimizationNeeded) ||
    normalizeProjectItems(ai?.resume?.optimizationNeeded)

  const bullets =
    (bulletsFromReport.length ? bulletsFromReport : undefined) ||
    normalizeBulletLab(ai?.resumeInsights?.bulletPointLab) ||
    normalizeBulletLab(ai?.resumeInsights?.bulletLab) ||
    normalizeBulletLab(ai?.resume?.bulletPointLab)

  const highHost = document.getElementById('resumeHighImpactList')
  if (highHost && highImpact.length) setHtml(highHost, renderHighImpact(highImpact))

  const optHost = document.getElementById('resumeOptimizationList')
  if (optHost && optimization.length) setHtml(optHost, renderOptimization(optimization))

  if (bullets.length) {
    const b1 = bullets[0]
    const b2 = bullets[1]

    if (b1) {
      setText(document.getElementById('resumeBullet1After'), b1.after)
    }
    if (b2) {
      setText(document.getElementById('resumeBullet2After'), b2.after)
    }
  }

  if (aiUnavailable) {
    const lead = document.querySelector('p.text-on-surface-variant.text-lg.max-w-2xl')
    setText(lead as HTMLElement | null, 'AI unavailable; showing baseline audit resume insights.')
  }
}

run().catch((e) => {
  const msg = e instanceof Error ? e.message : 'Failed to load resume insights'
  const lead = document.querySelector('p.text-on-surface-variant.text-lg.max-w-2xl')
  setText(lead as HTMLElement | null, msg)
})
