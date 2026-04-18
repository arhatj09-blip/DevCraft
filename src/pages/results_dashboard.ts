import { apiGet } from './_shared/api'
import {
  decorateInternalHtmlLinksWithJobId,
  ensureJobIdInUrl,
  requireJobIdOrRedirect,
  setLastJobId,
} from './_shared/auditSession'
import { asChips, escapeHtml, setHtml, setText } from './_shared/dom'

type Severity = 'info' | 'low' | 'medium' | 'high'

type AuditReport = {
  summary: { score: number; level: 'Beginner' | 'Intermediate' | 'Advanced'; verdict: string }
  projects: Array<{
    name: string
    url: string
    score: number
    strengths: string[]
    weaknesses: string[]
    issues: Array<{ title: string; severity: Severity; category: string; ruleId?: string; example: string }>
  }>
  liveApp?: { url: string; performanceScore?: number; accessibilityScore?: number; notes?: string[] }
  strengths: Array<{ title: string; evidence: string }>
  weaknesses: Array<{ title: string }>
  ai?: { modelUsed: string; cached: boolean; response: any }
}

type RepoSignal = {
  fullName: string
  htmlUrl?: string
  primaryLanguages?: string[]
  hasTests?: boolean
  hasCI?: boolean
  hasReadme?: boolean
  fileCount?: number
  topLevelFolders?: string[]
}

type DataCollection = {
  github?: { repos: RepoSignal[] }
}

type RepoCoreSummary = { unsafePatternFindings: number; secretFindings: number }

type RepoCoreSummaryExtended = RepoCoreSummary & {
  primaryLanguages?: string[]
  filesSampled?: number
  linesScanned?: number
  longLines?: number
  longFunctions?: number
  eslintIssues?: number
  hasTests?: boolean
  hasCI?: boolean
  hasReadme?: boolean
}

type AnalysisFinding = {
  id?: string
  category: string
  severity: Severity
  title: string
  message?: string
  tool?: string
  ruleId?: string
  filePath?: string
  line?: number
  evidence?: string
}

type RepoClassification = {
  confidence?: number
  metrics?: { totalFiles?: number }
}

type CodebaseAnalysis = {
  repos: Array<{
    repoFullName: string
    summary: RepoCoreSummaryExtended
    classification?: RepoClassification
    findings?: AnalysisFinding[]
    architectureAndDesign?: { folderStructure?: string[] }
  }>
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function severityRank(sev: Severity): number {
  if (sev === 'high') return 4
  if (sev === 'medium') return 3
  if (sev === 'low') return 2
  return 1
}

function setBar(el: HTMLElement | null, pct: number) {
  if (!el) return
  el.style.width = `${clampPct(pct)}%`
}

function fmtInt(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(n))
}

function fmtPct01(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-'
  return `${clampPct(n * 100)}%`
}

function fmtScore10(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-'
  const clamped = Math.max(0, Math.min(10, n))
  const s = (Math.round(clamped * 10) / 10).toFixed(1)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

function compactPath(p: string): string {
  const parts = p.split('/').filter(Boolean)
  if (parts.length <= 2) return p
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

type FixBucketId = 'longFunctions' | 'longLines' | 'unsafePatterns' | 'secrets'

type FixBucket = {
  id: FixBucketId
  label: string
  count: number
  toneClass: string
}

function getFixBuckets(analysis?: CodebaseAnalysis): FixBucket[] {
  const repos = analysis?.repos ?? []
  const longFunctions = repos.reduce((a, r) => a + (r.summary.longFunctions ?? 0), 0)
  const longLines = repos.reduce((a, r) => a + (r.summary.longLines ?? 0), 0)
  const unsafePatterns = repos.reduce((a, r) => a + (r.summary.unsafePatternFindings ?? 0), 0)
  const secrets = repos.reduce((a, r) => a + (r.summary.secretFindings ?? 0), 0)

  const buckets: FixBucket[] = [
    { id: 'longFunctions', label: 'Long functions', count: longFunctions, toneClass: 'text-error' },
    { id: 'unsafePatterns', label: 'Unsafe patterns', count: unsafePatterns, toneClass: 'text-tertiary' },
    { id: 'longLines', label: 'Long lines', count: longLines, toneClass: 'text-secondary' },
    { id: 'secrets', label: 'Potential secrets', count: secrets, toneClass: 'text-error' },
  ]

  return buckets.filter((b) => b.count > 0)
}

function renderDonutPie(buckets: FixBucket[]): { svg: string; legend: string; total: number } {
  const total = buckets.reduce((a, b) => a + b.count, 0)
  if (total <= 0) {
    return {
      svg: `<div class="text-on-surface-variant text-sm">No data</div>`,
      legend: `<div class="text-on-surface-variant text-sm">No fix-priority signals.</div>`,
      total: 0,
    }
  }

  // Donut chart: circumference is 100 when r=15.915494...
  let offset = 25 // rotate start point to top
  const segments = buckets
    .map((b) => {
      const pct = (b.count / total) * 100
      const seg = `
        <circle
          class="${escapeHtml(b.toneClass)}"
          cx="18" cy="18" r="15.91549430918954"
          fill="transparent"
          stroke="currentColor"
          stroke-width="4"
          stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"
          stroke-linecap="butt"
        />
      `
      offset -= pct
      return seg
    })
    .join('')

  const svg = `
    <svg width="96" height="96" viewBox="0 0 36 36" aria-label="Fix priority distribution">
      <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="rgba(0,0,0,0.06)" stroke-width="4" />
      ${segments}
      <circle cx="18" cy="18" r="12" fill="transparent" />
      <text x="18" y="19" text-anchor="middle" class="fill-current text-on-surface" style="font-size: 4px; font-weight: 700;">${escapeHtml(fmtInt(total))}</text>
      <text x="18" y="23" text-anchor="middle" class="fill-current text-on-surface-variant" style="font-size: 3px;">items</text>
    </svg>
  `

  const legend = buckets
    .slice(0, 6)
    .map(
      (b) => `
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2.5 h-2.5 rounded-full ${escapeHtml(b.toneClass)}" style="background: currentColor;"></span>
            <span class="text-on-surface">${escapeHtml(b.label)}</span>
          </div>
          <span class="text-on-surface-variant">${escapeHtml(fmtInt(b.count))}</span>
        </div>
      `,
    )
    .join('')

  return { svg, legend, total }
}

type FileIssue = {
  severity: Severity
  title: string
  message?: string
  ruleId?: string
  line?: number
  filePath: string
  example?: string
}

type IssueGroup = {
  key: string
  severity: Severity
  issues: FileIssue[]
}

function collectIssuesByFile(report: AuditReport, analysis?: CodebaseAnalysis): Map<string, FileIssue[]> {
  const byFile = new Map<string, FileIssue[]>()
  const push = (filePath: string, issue: FileIssue) => {
    const arr = byFile.get(filePath) ?? []
    arr.push(issue)
    byFile.set(filePath, arr)
  }

  for (const repo of analysis?.repos ?? []) {
    for (const f of repo.findings ?? []) {
      if (!f.filePath) continue
      push(f.filePath, {
        filePath: f.filePath,
        severity: f.severity,
        title: f.title,
        message: f.message,
        ruleId: f.ruleId,
        line: f.line,
        example: f.evidence,
      })
    }
  }

  // Fallback: parse report examples ("path:line: message")
  for (const p of report.projects) {
    for (const i of p.issues) {
      const filePath = i.example.split(':')[0]
      if (!filePath) continue
      push(filePath, {
        filePath,
        severity: i.severity,
        title: i.title,
        ruleId: i.ruleId,
        example: i.example,
      })
    }
  }

  // Sort issues per file by severity then title.
  for (const [k, arr] of byFile.entries()) {
    arr.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.title.localeCompare(b.title))
    byFile.set(k, arr)
  }

  return byFile
}

function severityTone(sev: Severity): { text: string; chip: string } {
  if (sev === 'high') return { text: 'text-error', chip: 'bg-error-container text-on-error-container' }
  if (sev === 'medium') return { text: 'text-tertiary', chip: 'bg-tertiary-container text-on-tertiary' }
  if (sev === 'low') return { text: 'text-secondary', chip: 'bg-secondary-container text-on-secondary' }
  return { text: 'text-on-surface-variant', chip: 'bg-surface-variant text-on-surface' }
}

function groupIssues(issues: FileIssue[]): IssueGroup[] {
  const groups = new Map<string, FileIssue[]>()

  for (const iss of issues) {
    const key = iss.title || 'Issue'
    const arr = groups.get(key) ?? []
    arr.push(iss)
    groups.set(key, arr)
  }

  const out: IssueGroup[] = []
  for (const [key, arr] of groups.entries()) {
    const worst = arr.reduce<Severity>((acc, cur) => {
      return severityRank(cur.severity) > severityRank(acc) ? cur.severity : acc
    }, 'info')

    out.push({ key, severity: worst, issues: arr })
  }

  out.sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      b.issues.length - a.issues.length ||
      a.key.localeCompare(b.key),
  )

  return out
}

function renderIssueRows(issues: FileIssue[], limit = 20): string {
  const rows = issues.slice(0, limit).map((iss) => {
    const tone = severityTone(iss.severity)
    const meta = [
      iss.ruleId ? `Rule: ${iss.ruleId}` : undefined,
      typeof iss.line === 'number' ? `Line: ${iss.line}` : undefined,
    ].filter(Boolean)

    const description = iss.message ?? iss.example ?? ''

    return `
      <div class="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/15">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${escapeHtml(tone.chip)}">${escapeHtml(iss.severity)}</span>
            <span class="text-sm font-medium text-on-surface truncate">${escapeHtml(iss.title)}</span>
          </div>
          <span class="text-xs text-on-surface-variant">${escapeHtml(meta.join(' • '))}</span>
        </div>
        ${description ? `<div class="mt-2 text-xs text-on-surface-variant font-mono overflow-x-auto">${escapeHtml(description)}</div>` : ''}
      </div>
    `
  })

  return `<div class="flex flex-col gap-2">${rows.join('')}</div>`
}

function renderHotspotIssues(filePath: string, issues: FileIssue[], selectedGroupKey?: string): string {
  if (!issues.length) {
    return `<div class="text-on-surface-variant text-sm">No issues recorded for this file.</div>`
  }

  const groups = groupIssues(issues)
  const selectedGroup = selectedGroupKey ? groups.find((g) => g.key === selectedGroupKey) : undefined
  const groupButtons = groups
    .map((g) => {
      const tone = severityTone(g.severity)
      const isActive = selectedGroupKey === g.key
      const base =
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-outline-variant/20'
      const active = isActive
        ? ' bg-primary-fixed-dim text-on-primary-fixed'
        : ' bg-surface-container-lowest text-on-surface hover:bg-surface-variant'

      return `
        <button
          type="button"
          class="${base}${active}"
          data-hotspot-issue-group="${escapeHtml(g.key)}"
        >
          <span class="${escapeHtml(tone.text)}">●</span>
          <span>${escapeHtml(g.key)}</span>
          <span class="text-on-surface-variant">(${escapeHtml(fmtInt(g.issues.length))})</span>
        </button>
      `
    })
    .join('')

  const details = selectedGroup
    ? `
      <div class="mt-3">
        <div class="mb-2 text-xs text-on-surface-variant">Showing ${Math.min(selectedGroup.issues.length, 20)} of ${selectedGroup.issues.length} for <span class="text-on-surface">${escapeHtml(selectedGroup.key)}</span>.</div>
        ${renderIssueRows(selectedGroup.issues, 20)}
      </div>
    `
    : `<div class="mt-3 text-on-surface-variant text-sm">Click an option above to view the issue details.</div>`

  return `
    <div class="mb-2 text-xs text-on-surface-variant">Issues for <span class="text-on-surface">${escapeHtml(compactPath(filePath))}</span> are grouped. Select an option to view details.</div>
    <div class="flex flex-wrap gap-2">${groupButtons}</div>
    ${details}
  `
}

function computeTestPct(collection?: DataCollection): number {
  const repos = collection?.github?.repos ?? []
  if (repos.length === 0) return 0
  const withTests = repos.filter((r) => r.hasTests).length
  return clampPct((withTests / repos.length) * 100)
}

function computeSecurityPct(analysis?: CodebaseAnalysis): number {
  const repos = analysis?.repos ?? []
  if (repos.length === 0) return 0

  const scores = repos.map((r) => {
    const unsafe = r.summary?.unsafePatternFindings ?? 0
    const secrets = r.summary?.secretFindings ?? 0
    const score = 100 - unsafe * 8 - secrets * 18
    return Math.max(0, Math.min(100, score))
  })

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return clampPct(avg)
}

function renderProjectBreakdown(report: AuditReport, collection?: DataCollection): string {
  const repoSignals = new Map((collection?.github?.repos ?? []).map((r) => [r.fullName, r]))

  const items = report.projects.slice(0, 8).map((p) => {
    const sig = repoSignals.get(p.name)
    const langs = sig?.primaryLanguages?.length ? sig.primaryLanguages.join(', ') : 'N/A'
    const color = p.score >= 7 ? 'text-primary' : p.score >= 4 ? 'text-on-surface-variant' : 'text-tertiary'

    return `
      <div class="bg-surface-container-lowest p-4 rounded-lg flex items-center justify-between border border-outline-variant/15">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-outline text-[24px]">folder_copy</span>
          <div>
            <h4 class="font-medium text-sm text-on-surface">${escapeHtml(p.name)}</h4>
            <span class="text-xs text-on-surface-variant">${escapeHtml(langs)}</span>
          </div>
        </div>
        <div class="${color} font-semibold text-sm">${p.score.toFixed(1)}/10</div>
      </div>
    `
  })

  if (items.length === 0) {
    return `<div class="text-sm text-on-surface-variant">No repositories were analyzed for this audit.</div>`
  }

  return items.join('')
}

function renderCodeInsights(report: AuditReport): string {
  const issues = report.projects
    .flatMap((p) => p.issues.map((i) => ({ ...i, repoFullName: p.name })))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 2)

  if (issues.length === 0) {
    return `<div class="text-sm text-on-surface-variant">No code findings available for this audit.</div>`
  }

  return issues
    .map((i) => {
      const tone = i.severity === 'high' || i.severity === 'medium' ? 'text-tertiary' : 'text-primary'
      const border = i.severity === 'high' || i.severity === 'medium' ? 'border-tertiary' : 'border-primary'
      const label = i.severity === 'high' || i.severity === 'medium' ? 'Issue' : 'Signal'

      return `
        <div class="bg-surface-container rounded-xl overflow-hidden flex flex-col md:flex-row border border-outline-variant/15">
          <div class="p-5 md:w-1/3 flex flex-col justify-center bg-surface-container-low border-b md:border-b-0 md:border-r border-outline-variant/15">
            <div class="flex items-center gap-2 mb-2 ${tone}">
              <span class="material-symbols-outlined text-[18px]">bolt</span>
              <span class="font-semibold text-sm">${escapeHtml(label)} (${escapeHtml(i.severity)})</span>
            </div>
            <h4 class="font-headline text-on-surface font-medium mb-1">${escapeHtml(i.title)}</h4>
            <p class="text-xs text-on-surface-variant">${escapeHtml(i.repoFullName)}</p>
          </div>
          <div class="md:w-2/3 p-4 bg-surface-container-lowest">
            <div class="bg-surface-container-lowest border-l-4 ${border} p-3 rounded-r-DEFAULT font-mono text-xs text-on-surface-variant overflow-x-auto">
              <code>${escapeHtml(i.example)}</code>
            </div>
          </div>
        </div>
      `
    })
    .join('')
}

function renderScoreBreakdownRows(scores: Array<{ label: string; score: number }>): string {
  if (scores.length === 0) {
    return `<div class="text-on-surface-variant">No score breakdown available.</div>`
  }

  return scores
    .map(
      (s) => `
        <div class="flex justify-between">
          <span class="text-on-surface">${escapeHtml(s.label)}</span>
          <span class="text-on-surface-variant">${escapeHtml(fmtScore10(s.score))}/10</span>
        </div>
      `,
    )
    .join('')
}

function renderFixPriority(analysis?: CodebaseAnalysis): string {
  const repos = analysis?.repos ?? []
  const longFunctions = repos.reduce((a, r) => a + (r.summary.longFunctions ?? 0), 0)
  const longLines = repos.reduce((a, r) => a + (r.summary.longLines ?? 0), 0)
  const unsafe = repos.reduce((a, r) => a + (r.summary.unsafePatternFindings ?? 0), 0)
  const secrets = repos.reduce((a, r) => a + (r.summary.secretFindings ?? 0), 0)

  const items: Array<{ label: string; impact: 'High Impact' | 'Medium' | 'Low'; color: string }> = []
  if (secrets > 0) items.push({ label: `Potential secrets (${secrets})`, impact: 'High Impact', color: 'text-error' })
  if (unsafe > 0) items.push({ label: `Unsafe patterns (${unsafe})`, impact: 'Medium', color: 'text-tertiary' })
  if (longFunctions > 0) items.push({ label: `Long functions (>= 60 lines) (${longFunctions})`, impact: 'High Impact', color: 'text-error' })
  if (longLines > 0) items.push({ label: `Long lines (> 120 chars) (${longLines})`, impact: 'Low', color: 'text-secondary' })

  if (items.length === 0) {
    return `<div class="text-on-surface-variant">No high-priority fixes detected in the current sample.</div>`
  }

  return items
    .slice(0, 6)
    .map(
      (i) => `
        <div class="flex justify-between items-center">
          <span class="${escapeHtml(i.color)} font-medium">${escapeHtml(i.label)}</span>
          <span class="text-xs text-on-surface-variant">${escapeHtml(i.impact)}</span>
        </div>
      `,
    )
    .join('')
}

function renderHotspotFiles(report: AuditReport, analysis?: CodebaseAnalysis): string {
  const counts = new Map<string, number>()

  const analysisFindings = (analysis?.repos ?? []).flatMap((r) => r.findings ?? [])
  for (const f of analysisFindings) {
    if (!f.filePath) continue
    counts.set(f.filePath, (counts.get(f.filePath) ?? 0) + 1)
  }

  if (counts.size === 0) {
    for (const i of report.projects.flatMap((p) => p.issues)) {
      const maybePath = i.example.split(':')[0]
      if (!maybePath) continue
      counts.set(maybePath, (counts.get(maybePath) ?? 0) + 1)
    }
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  if (top.length === 0) {
    return `<div class="text-on-surface-variant">No hotspots detected.</div>`
  }

  return top
    .map(([path, n]) => {
      const label = compactPath(path)
      const countLabel = `${n} issue${n === 1 ? '' : 's'}`
      return `
        <button
          type="button"
          class="bg-surface-container-lowest p-4 rounded-lg flex justify-between border border-outline-variant/15 hover:bg-surface-container-low transition-all text-left"
          data-hotspot-file="${escapeHtml(path)}"
        >
          <span class="text-on-surface text-sm">${escapeHtml(label)}</span>
          <span class="text-tertiary text-sm font-medium">${escapeHtml(countLabel)}</span>
        </button>
      `
    })
    .join('')
}

function renderSecurityAlerts(report: AuditReport, analysis?: CodebaseAnalysis): string {
  const findings = (analysis?.repos ?? [])
    .flatMap((r) => r.findings ?? [])
    .filter((f) => f.category === 'security' || (f.ruleId ?? '').startsWith('unsafe.') || (f.ruleId ?? '').includes('secret'))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 2)

  if (findings.length === 0) {
    const unsafeSignal = report.projects
      .flatMap((p) => p.weaknesses)
      .some((w) => w.toLowerCase().includes('unsafe patterns') || w.toLowerCase().includes('xss'))

    if (unsafeSignal) {
      return `
        <div class="bg-error-container text-on-error-container p-4 rounded-lg text-sm">
          <p class="font-medium">Unsafe patterns detected</p>
          <p class="text-xs mt-1">Potentially unsafe HTML rendering or similar patterns were detected in the repo sample.</p>
          <p class="text-xs mt-1 opacity-80">Details unavailable (analysis findings not provided).</p>
        </div>
      `
    }

    return `<div class="text-on-surface-variant text-sm">No security alerts detected in the sampled files.</div>`
  }

  return findings
    .map((f) => {
      const file = f.filePath ? compactPath(f.filePath) : 'Unknown file'
      const message = f.message ?? 'Security pattern matched.'
      return `
        <div class="bg-error-container text-on-error-container p-4 rounded-lg text-sm">
          <p class="font-medium">${escapeHtml(f.title)}</p>
          <p class="text-xs mt-1">${escapeHtml(message)}</p>
          <p class="text-xs mt-1 opacity-80">File: ${escapeHtml(file)}</p>
        </div>
      `
    })
    .join('')
}

function renderProjectComplexity(collection?: DataCollection, analysis?: CodebaseAnalysis): string {
  const repos = collection?.github?.repos ?? []
  const folders = new Set(repos.flatMap((r) => r.topLevelFolders ?? []))
  const fileCount = repos.reduce((a, r) => a + (r.fileCount ?? 0), 0)

  const analysisFolders = new Set(
    (analysis?.repos ?? []).flatMap((r) => r.architectureAndDesign?.folderStructure ?? []),
  )

  const isMonorepo = folders.has('apps') || folders.has('packages') || [...analysisFolders].some((s) => s.toLowerCase().includes('monorepo'))
  const hasCI = repos.some((r) => r.hasCI)
  const hasTests = repos.some((r) => r.hasTests)
  const langs = new Set(repos.flatMap((r) => r.primaryLanguages ?? []))

  const bullets: string[] = []
  if (isMonorepo) bullets.push('• Monorepo architecture detected')
  if (fileCount > 0) bullets.push(`• Project size: ${fmtInt(fileCount)} files`) 
  if (hasCI) bullets.push('• CI/CD pipelines configured')
  if (hasTests) bullets.push('• Automated tests detected')
  if (langs.size > 0) bullets.push(`• Languages observed: ${[...langs].slice(0, 4).join(', ')}`)

  if (bullets.length === 0) {
    bullets.push('No complexity signals available.')
  }

  return bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')
}

async function run() {
  const jobId = requireJobIdOrRedirect('landing_page.html')
  setLastJobId(jobId)
  ensureJobIdInUrl(jobId)
  decorateInternalHtmlLinksWithJobId(jobId)

  // Poll for result with exponential backoff
  let report: AuditReport | undefined
  let retries = 0
  const maxRetries = 30
  let delay = 500

  while (retries < maxRetries) {
    try {
      const resp = await fetch(`/api/audit/${encodeURIComponent(jobId)}/result`, {
        method: 'GET',
        cache: 'no-store',
        headers: { accept: 'application/json' },
      })

      if (resp.ok) {
        report = (await resp.json()) as AuditReport
        break
      }

      if (resp.status === 202) {
        // Still processing, wait and retry
        retries++
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * 1.5, 3000) // Exponential backoff, max 3s
        continue
      }

      // Other error status
      const text = await resp.text()
      let json
      try {
        json = JSON.parse(text)
      } catch {
        json = text
      }
      const msg =
        typeof json === 'object' && json && 'error' in json
          ? (json as any).error?.message
          : undefined
      throw new Error(msg ?? `GET /api/audit/${jobId}/result failed (${resp.status})`)
    } catch (error) {
      if (retries >= maxRetries) throw error
      retries++
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay = Math.min(delay * 1.5, 3000)
    }
  }

  if (!report) throw new Error('Timeout waiting for audit result')

  const [collection, analysis] = await Promise.all([
    apiGet<DataCollection>(`/api/audit/${encodeURIComponent(jobId)}/collection`).catch(() => undefined),
    apiGet<CodebaseAnalysis>(`/api/audit/${encodeURIComponent(jobId)}/analysis`).catch(() => undefined),
  ])

  setText(document.getElementById('profileLevel'), `${report.summary.level} Developer`)
  setText(document.getElementById('score10'), report.summary.score.toFixed(1))
  setText(document.getElementById('execSummary'), report.summary.verdict)

  const aiStrengths: string[] | undefined = report.ai?.response?.skillMap?.coreStrengths
  const aiWeaknesses: string[] | undefined = report.ai?.response?.skillMap?.criticalWeaknesses

  const strengths = (aiStrengths && aiStrengths.length ? aiStrengths : report.strengths.map((s) => s.title)).slice(0, 8)
  const weaknesses = (aiWeaknesses && aiWeaknesses.length ? aiWeaknesses : report.weaknesses.map((w) => w.title)).slice(0, 8)

  setHtml(document.getElementById('strengthChips'), asChips(strengths, { variant: 'good' }))
  setHtml(document.getElementById('weaknessChips'), asChips(weaknesses, { variant: 'bad' }))

  const maintainability = clampPct((report.summary.score / 10) * 100)
  const security = computeSecurityPct(analysis)
  const tests = computeTestPct(collection)

  setText(document.getElementById('metricMaintainability'), `${maintainability}%`)
  setText(document.getElementById('metricSecurity'), `${security}%`)
  setText(document.getElementById('metricTests'), `${tests}%`)

  setBar(document.getElementById('metricMaintainabilityBar') as HTMLElement | null, maintainability)
  setBar(document.getElementById('metricSecurityBar') as HTMLElement | null, security)
  setBar(document.getElementById('metricTestsBar') as HTMLElement | null, tests)

  setHtml(document.getElementById('codeInsights'), renderCodeInsights(report))
  setHtml(document.getElementById('projectBreakdown'), renderProjectBreakdown(report, collection))

  const repos = analysis?.repos ?? []
  const sampledFiles = repos.reduce((a, r) => a + (r.summary.filesSampled ?? 0), 0)
  const scannedLines = repos.reduce((a, r) => a + (r.summary.linesScanned ?? 0), 0)
  const confidenceValues = repos
    .map((r) => r.classification?.confidence)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  const confidence = confidenceValues.length ? avg(confidenceValues) : undefined

  const totalFilesFromCollection = (collection?.github?.repos ?? []).reduce((a, r) => a + (r.fileCount ?? 0), 0)
  const totalFilesFromAnalysis = repos.reduce((a, r) => a + (r.classification?.metrics?.totalFiles ?? 0), 0)
  const totalFiles = totalFilesFromCollection || totalFilesFromAnalysis || 0

  const overall = report.summary.score
  const longFunctions = repos.reduce((a, r) => a + (r.summary.longFunctions ?? 0), 0)
  const longLines = repos.reduce((a, r) => a + (r.summary.longLines ?? 0), 0)
  const eslintIssues = repos.reduce((a, r) => a + (r.summary.eslintIssues ?? 0), 0)

  const codeQualityScore = Math.max(0, Math.min(10, overall - Math.min(2, longFunctions * 0.05) - Math.min(1, longLines * 0.005) - Math.min(1, eslintIssues * 0.03)))
  const testingScore = Math.max(0, Math.min(10, 5 + tests / 20))
  const securityScore = Math.max(0, Math.min(10, security / 10))
  const architectureScore = Math.max(0, Math.min(10, overall))

  setHtml(
    document.getElementById('scoreBreakdownRows'),
    renderScoreBreakdownRows([
      { label: 'Code Quality', score: codeQualityScore },
      { label: 'Testing', score: testingScore },
      { label: 'Security', score: securityScore },
      { label: 'Architecture', score: architectureScore },
    ]),
  )

  setHtml(document.getElementById('fixPriorityList'), renderFixPriority(analysis))

  // Hotspot: pie chart + clickable file list + per-file issues panel.
  const fixBuckets = getFixBuckets(analysis)
  const pie = renderDonutPie(fixBuckets)
  setHtml(document.getElementById('hotspotPieHost'), pie.svg)
  setHtml(document.getElementById('hotspotPieLegend'), pie.legend)
  setText(document.getElementById('hotspotPieTotal'), pie.total > 0 ? `${fmtInt(pie.total)} total` : '-')

  const issuesByFile = collectIssuesByFile(report, analysis)
  setHtml(document.getElementById('hotspotFilesList'), renderHotspotFiles(report, analysis))

  const hotspotFilesEl = document.getElementById('hotspotFilesList')
  const hotspotIssuesEl = document.getElementById('hotspotIssuesHost')
  const selectedFileEl = document.getElementById('hotspotSelectedFile')

  let selectedHotspotFilePath: string | undefined

  const clearSelected = () => {
    selectedHotspotFilePath = undefined
    setText(selectedFileEl, 'Select a file')
    setHtml(
      hotspotIssuesEl,
      '<div class="text-on-surface-variant text-sm">Click a hotspot file to view issues.</div>',
    )
  }

  const setSelected = (filePath: string) => {
    selectedHotspotFilePath = filePath
    setText(selectedFileEl, compactPath(filePath))
    const issues = issuesByFile.get(filePath) ?? []
    setHtml(hotspotIssuesEl, renderHotspotIssues(filePath, issues))
  }

  hotspotFilesEl?.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null
    const btn = target?.closest?.('[data-hotspot-file]') as HTMLElement | null
    const filePath = btn?.getAttribute('data-hotspot-file')
    if (!filePath) return
    if (selectedHotspotFilePath === filePath) {
      clearSelected()
      return
    }
    setSelected(filePath)
  })

  hotspotIssuesEl?.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null
    const btn = target?.closest?.('[data-hotspot-issue-group]') as HTMLElement | null
    const groupKey = btn?.getAttribute('data-hotspot-issue-group')
    if (!groupKey) return
    if (!selectedHotspotFilePath) return

    const issues = issuesByFile.get(selectedHotspotFilePath) ?? []
    setHtml(hotspotIssuesEl, renderHotspotIssues(selectedHotspotFilePath, issues, groupKey))
  })

  // Auto-select the first hotspot file if available.
  const firstHotspot = hotspotFilesEl?.querySelector?.('[data-hotspot-file]') as HTMLElement | null
  const firstPath = firstHotspot?.getAttribute('data-hotspot-file')
  if (firstPath) setSelected(firstPath)

  setHtml(document.getElementById('securityAlertsHost'), renderSecurityAlerts(report, analysis))
  setHtml(document.getElementById('projectComplexityList'), renderProjectComplexity(collection, analysis))

  setText(document.getElementById('coverageFilesSampled'), sampledFiles > 0 ? fmtInt(sampledFiles) : '-')
  setText(document.getElementById('coverageFilesTotal'), totalFiles > 0 ? fmtInt(totalFiles) : '-')
  setText(document.getElementById('coverageLinesScanned'), scannedLines > 0 ? fmtInt(scannedLines) : '-')
  setText(document.getElementById('coverageConfidence'), fmtPct01(confidence))

  // Setup PDF download button (always show this)
  const downloadBtn = document.getElementById('downloadPdfBtn') as HTMLButtonElement | null
  if (downloadBtn) {
    downloadBtn.style.display = 'flex'
    downloadBtn.addEventListener('click', async () => {
      try {
        downloadBtn.disabled = true
        downloadBtn.textContent = 'Generating...'
        const response = await fetch(`/api/audit/${encodeURIComponent(jobId)}/report/pdf`)
        if (!response.ok) throw new Error('Failed to generate report')
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `DevSkill-Audit-Report-${jobId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        downloadBtn.textContent = 'Download Report'
        downloadBtn.disabled = false
      } catch (error) {
        console.error('Download failed:', error)
        downloadBtn.textContent = 'Download Failed'
        downloadBtn.disabled = false
        setTimeout(() => {
          downloadBtn.textContent = 'Download Report'
        }, 2000)
      }
    })
  }

  const liveCard = document.getElementById('liveAppCard')
  if (!report.liveApp) {
    if (liveCard) {
      liveCard.classList.add('opacity-50')
      setText(document.getElementById('liveA11yNote'), 'No live app URL provided for this audit.')
      setText(document.getElementById('livePerfScore'), '-')
      setText(document.getElementById('liveA11yScore'), '-')
      setBar(document.getElementById('livePerfBar') as HTMLElement | null, 0)
      setBar(document.getElementById('liveA11yBar') as HTMLElement | null, 0)
    }
    return
  }

  const perf = typeof report.liveApp.performanceScore === 'number' ? clampPct(report.liveApp.performanceScore) : 0
  const a11y = typeof report.liveApp.accessibilityScore === 'number' ? clampPct(report.liveApp.accessibilityScore) : 0

  setText(document.getElementById('livePerfScore'), `${perf}`)
  setText(document.getElementById('liveA11yScore'), `${a11y}`)
  setBar(document.getElementById('livePerfBar') as HTMLElement | null, perf)
  setBar(document.getElementById('liveA11yBar') as HTMLElement | null, a11y)

  const note = report.liveApp.notes?.find((n) => n.toLowerCase().includes('accessibility')) ?? report.liveApp.notes?.[0]
  if (note) setText(document.getElementById('liveA11yNote'), note)
}

run().catch((e) => {
  // Keep page stable; show minimal signal in the summary.
  const msg = e instanceof Error ? e.message : 'Failed to load audit result'
  setText(document.getElementById('execSummary'), msg)
})
