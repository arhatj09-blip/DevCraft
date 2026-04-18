import { apiGet } from './_shared/api'
import {
  decorateInternalHtmlLinksWithJobId,
  ensureJobIdInUrl,
  requireJobIdOrRedirect,
  setLastJobId,
} from './_shared/auditSession'
import { escapeHtml, setHtml, setText } from './_shared/dom'

type AuditReport = {
  summary: { level: string; score: number; verdict: string }
  strengths: Array<{ title: string }>
  weaknesses: Array<{ title: string }>
  projects?: Array<{ name: string; issues: Array<{ title: string; example: string }> }>
  careerInsights?: {
    suitableRoles: Array<{ role: string; why: string[] }>
    notReadyFor: Array<{ role: string; why: string[] }>
  }
  ai?: { modelUsed?: string; response: any }
}

type RoleItem = { title: string; reason?: string }

type ReasonItem = { title: string; detail?: string }

function normalizeRoleItems(value: unknown): RoleItem[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'string') return { title: v }
        if (v && typeof v === 'object') {
          const obj: any = v
          const title = obj.title ?? obj.role ?? obj.name
          const reason = obj.reason ?? obj.rationale ?? obj.detail
          if (typeof title === 'string') return { title, reason: typeof reason === 'string' ? reason : undefined }
        }
        return null
      })
      .filter(Boolean) as RoleItem[]
  }
  return []
}

function normalizeReasonItems(value: unknown): ReasonItem[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'string') return { title: v }
        if (v && typeof v === 'object') {
          const obj: any = v
          const title = obj.title ?? obj.point ?? obj.heading
          const detail = obj.detail ?? obj.reason ?? obj.explanation
          if (typeof title === 'string') return { title, detail: typeof detail === 'string' ? detail : undefined }
        }
        return null
      })
      .filter(Boolean) as ReasonItem[]
  }
  return []
}

function renderRoleCards(items: RoleItem[], kind: 'verified' | 'gap'): string {
  const badgeClass =
    kind === 'verified'
      ? 'px-3 py-1 bg-primary-fixed-dim text-on-primary-fixed text-xs font-semibold rounded-full tracking-wide'
      : 'px-3 py-1 bg-tertiary-container text-on-tertiary-container text-xs font-semibold rounded-full tracking-wide'
  const badgeText = kind === 'verified' ? 'VERIFIED' : 'GAP DETECTED'
  const cardBg = kind === 'verified' ? 'bg-surface-container-lowest' : 'bg-surface-container-low'

  const top = items.slice(0, 3)
  if (top.length === 0) return ''

  return top
    .map((r) => {
      const subtitle = r.reason ? `<p class="text-on-surface-variant text-sm mt-1">${escapeHtml(r.reason)}</p>` : ''
      return `
        <div class="${cardBg} p-5 rounded-lg flex items-center justify-between">
          <div>
            <h4 class="font-headline font-semibold text-on-surface text-lg">${escapeHtml(r.title)}</h4>
            ${subtitle}
          </div>
          <span class="${badgeClass}">${badgeText}</span>
        </div>
      `
    })
    .join('')
}

function renderReasoning(items: ReasonItem[]): string {
  const icons = ['architecture', 'database', 'integration_instructions']
  const tones = ['text-on-surface', 'text-tertiary', 'text-on-surface']

  const top = items.slice(0, 3)
  if (top.length === 0) return ''

  return top
    .map((p, idx) => {
      const icon = icons[idx] ?? 'troubleshoot'
      const tone = tones[idx] ?? 'text-on-surface'
      const detail = p.detail ?? ''

      return `
        <div class="flex gap-5 items-start">
          <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 mt-0.5">
            <span class="material-symbols-outlined ${tone} text-[16px]">${escapeHtml(icon)}</span>
          </div>
          <div>
            <h4 class="font-headline font-semibold text-on-surface text-base mb-1">${escapeHtml(p.title)}</h4>
            <p class="text-on-surface-variant text-sm leading-relaxed">${escapeHtml(detail)}</p>
          </div>
        </div>
      `
    })
    .join('')
}

function buildAuditReasoningFromAI(ai: any, report: any): ReasonItem[] {
  if (!ai) return []
  
  const reasoning: ReasonItem[] = []

  // 1. What the audit verified - from core strengths and honest feedback
  let verifiedDetail = ''
  if (ai.skillMap?.coreStrengths?.length) {
    verifiedDetail = ai.skillMap.coreStrengths.slice(0, 2).join(' • ')
  } else if (ai.honestFeedback?.[0]?.statement) {
    verifiedDetail = ai.honestFeedback[0].statement
  } else {
    verifiedDetail = report.summary.verdict
  }
  reasoning.push({ title: 'What the audit verified', detail: verifiedDetail })

  // 2. What blocks role expansion - from skill gaps and why they block progression
  let blocksDetail = ''
  if (ai.skillGapAnalysis?.length) {
    const gap = ai.skillGapAnalysis[0]
    blocksDetail = gap.gap + ' — ' + (gap.whyBlocksProgression || 'Critical for role advancement')
  } else if (ai.skillMap?.criticalWeaknesses?.length) {
    blocksDetail = ai.skillMap.criticalWeaknesses.slice(0, 2).join(' • ')
  } else {
    blocksDetail = 'Gaps detected in core engineering practices'
  }
  reasoning.push({ title: 'What blocks role expansion', detail: blocksDetail })

  // 3. How to position yourself now - from level estimate reasoning
  let positionDetail = ''
  if (ai.levelEstimate?.reasoning?.length) {
    positionDetail = Array.isArray(ai.levelEstimate.reasoning) 
      ? ai.levelEstimate.reasoning[0]
      : ai.levelEstimate.reasoning
  } else if (ai.brutallyHonestSummary) {
    positionDetail = ai.brutallyHonestSummary
  } else {
    positionDetail = report.summary.verdict
  }
  reasoning.push({ title: 'How to position yourself now', detail: positionDetail })

  return reasoning
}

function renderHonestFeedback(feedbackItem: any): string {
  if (!feedbackItem) return ''
  const statement = feedbackItem.statement ?? 'Strong engineering practices detected.'
  const flaws = Array.isArray(feedbackItem.flaws) ? feedbackItem.flaws.slice(0, 3) : []
  
  let html = `<p class="text-on-surface font-semibold text-base mb-4">${escapeHtml(statement)}</p>`
  if (flaws.length) {
    html += '<div class="space-y-2 text-sm">'
    flaws.forEach((flaw: any) => {
      const text = typeof flaw === 'string' ? flaw : flaw.text ?? ''
      html += `<div class="flex gap-2"><span class="text-tertiary">•</span><span class="text-on-surface-variant">${escapeHtml(text)}</span></div>`
    })
    html += '</div>'
  }
  return html
}

function renderLevelEstimate(levelData: any): string {
  if (!levelData) return ''
  const level = levelData.level ?? '–'
  const percentile = levelData.percentile ?? '–'
  const reasoning = Array.isArray(levelData.reasoning) ? levelData.reasoning[0] : levelData.reasoning ?? ''
  
  return `
    <div class="mb-3">
      <div class="text-2xl font-headline font-bold text-on-surface">${escapeHtml(level)}</div>
      <div class="text-xs text-on-surface-variant mt-1">Percentile: <span class="text-primary font-semibold">${escapeHtml(fmtInt(percentile))}</span></div>
    </div>
    ${reasoning ? `<p class="text-xs text-on-surface-variant leading-relaxed">${escapeHtml(reasoning)}</p>` : ''}
  `
}

function renderSkillList(items: string[]): string {
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .slice(0, 4)
    .map((item: any) => {
      const text = typeof item === 'string' ? item : item.title ?? item.name ?? ''
      return `<div class="flex gap-2 items-start"><span class="text-primary text-[18px]">•</span><span class="text-on-surface-variant text-sm">${escapeHtml(text)}</span></div>`
    })
    .join('')
}

function renderSkillGaps(gaps: any[], projectIssues?: any[]): string {
  if (!Array.isArray(gaps) || gaps.length === 0) return ''
  
  return gaps
    .slice(0, 2)
    .map((gap: any, gapIdx: number) => {
      const gapTitle = gap.gap ?? gap.title ?? 'Skill Gap'
      const why = gap.whyBlocksProgression ?? gap.why ?? gap.description ?? ''
      const fixes = Array.isArray(gap.recommendedFixes) ? gap.recommendedFixes : []
      const fixText = fixes.length ? fixes[0] : ''
      
      // Add evidence from project issues if available
      let evidence = ''
      if (Array.isArray(projectIssues) && projectIssues.length > 0) {
        const issue = projectIssues[gapIdx] ?? projectIssues[0]
        if (issue) {
          const exampleText = typeof issue.example === 'string' 
            ? issue.example.split(':').slice(-1)[0].trim() 
            : issue.title
          evidence = `<div class="bg-surface-container-high/50 rounded p-2 text-xs text-on-surface-variant mt-2 border-l-2 border-tertiary"><strong>Example:</strong> ${escapeHtml(exampleText)}</div>`
        }
      }
      
      return `
        <div class="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/15">
          <h4 class="font-headline font-semibold text-on-surface mb-2">${escapeHtml(gapTitle)}</h4>
          <p class="text-xs text-on-surface-variant mb-3">${escapeHtml(why)}</p>
          ${fixText ? `<div class="bg-tertiary-container/20 rounded p-3 text-xs text-on-surface-variant"><strong>Fix:</strong> ${escapeHtml(fixText)}</div>` : ''}
          ${evidence}
        </div>
      `
    })
    .join('')
}

function fmtInt(n: any): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '–'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(n))
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
  const targetRolesFromReport: RoleItem[] = (report.careerInsights?.suitableRoles ?? []).map((r) => ({
    title: r.role,
    reason: r.why?.[0],
  }))

  const devVectorsFromReport: RoleItem[] = (report.careerInsights?.notReadyFor ?? []).map((r) => ({
    title: r.role,
    reason: r.why?.[0],
  }))

  const targetRoles =
    (targetRolesFromReport.length ? targetRolesFromReport : undefined) ||
    normalizeRoleItems(ai?.roleReadiness?.ready) ||
    normalizeRoleItems(ai?.careerInsights?.targetRoles) ||
    normalizeRoleItems(ai?.careerInsights?.readyForRoles) ||
    normalizeRoleItems(ai?.career?.targetRoles)

  const devVectors =
    (devVectorsFromReport.length ? devVectorsFromReport : undefined) ||
    normalizeRoleItems(ai?.roleReadiness?.notReady) ||
    normalizeRoleItems(ai?.careerInsights?.developmentVectors) ||
    normalizeRoleItems(ai?.careerInsights?.notReadyForRoles) ||
    normalizeRoleItems(ai?.career?.developmentVectors)

  const reasoning =
    normalizeReasonItems(ai?.careerInsights?.auditReasoning) ||
    normalizeReasonItems(ai?.careerInsights?.reasoningPoints) ||
    normalizeReasonItems(ai?.career?.auditReasoning)

  const targetHost = document.getElementById('careerTargetRoles')
  const vectorsHost = document.getElementById('careerDevVectors')
  const reasoningHost = document.getElementById('careerReasoning')

  if (targetHost && targetRoles.length) setHtml(targetHost, renderRoleCards(targetRoles, 'verified'))
  if (vectorsHost && devVectors.length) setHtml(vectorsHost, renderRoleCards(devVectors, 'gap'))

  // Build audit reasoning from AI data or fallback to report-based reasoning
  if (reasoningHost) {
    if (reasoning.length) {
      setHtml(reasoningHost, renderReasoning(reasoning))
    } else {
      // Build reasoning from AI honestFeedback, skillGapAnalysis, and levelEstimate
      const aiReasoningItems = buildAuditReasoningFromAI(ai, report)
      if (aiReasoningItems.length) {
        setHtml(reasoningHost, renderReasoning(aiReasoningItems))
      } else {
        // Fallback to report-based reasoning
        const s1 = report.strengths[0]?.title
        const s2 = report.strengths[1]?.title
        const w1 = report.weaknesses[0]?.title
        const w2 = report.weaknesses[1]?.title

        const derived: ReasonItem[] = [
          { title: 'What the audit verified', detail: [s1, s2].filter(Boolean).join(' • ') || report.summary.verdict },
          { title: 'What blocks role expansion', detail: [w1, w2].filter(Boolean).join(' • ') || 'Gaps detected in core engineering practices.' },
          { title: 'How to position yourself now', detail: report.summary.verdict },
        ]

        setHtml(reasoningHost, renderReasoning(derived))
      }
    }
  }

  // Last-resort fallback.
  if (targetHost && !targetRoles.length) {
    const fallback = report.strengths.slice(0, 2).map((s) => ({ title: s.title, reason: 'Derived from verified strengths.' }))
    setHtml(targetHost, renderRoleCards(fallback, 'verified'))
  }
  if (vectorsHost && !devVectors.length) {
    const fallback = report.weaknesses.slice(0, 2).map((w) => ({ title: w.title, reason: 'Derived from critical weaknesses.' }))
    setHtml(vectorsHost, renderRoleCards(fallback, 'gap'))
  }

  // Render new AI-powered sections: Honest Feedback, Level Estimate, Skill Map, Skill Gaps
  const honestFeedbackHost = document.getElementById('careerHonestFeedback')
  const levelHost = document.getElementById('careerLevelEstimate')
  const coreStrengthsHost = document.getElementById('careerCoreStrengths')
  const weakAreasHost = document.getElementById('careerWeakAreas')
  const skillGapsHost = document.getElementById('careerSkillGaps')

  if (honestFeedbackHost && ai?.honestFeedback && Array.isArray(ai.honestFeedback) && ai.honestFeedback.length > 0) {
    setHtml(honestFeedbackHost, renderHonestFeedback(ai.honestFeedback[0]))
  }

  if (levelHost && ai?.levelEstimate) {
    setHtml(levelHost, renderLevelEstimate(ai.levelEstimate))
  }

  if (coreStrengthsHost && ai?.skillMap?.coreStrengths) {
    setHtml(coreStrengthsHost, renderSkillList(ai.skillMap.coreStrengths))
  }

  if (weakAreasHost && ai?.skillMap?.criticalWeaknesses) {
    setHtml(weakAreasHost, renderSkillList(ai.skillMap.criticalWeaknesses))
  }

  if (skillGapsHost && ai?.skillGapAnalysis && Array.isArray(ai.skillGapAnalysis)) {
    // Collect project issues for evidence
    const projectIssues = report.projects?.flatMap((p: any) => p.issues ?? []) ?? []
    setHtml(skillGapsHost, renderSkillGaps(ai.skillGapAnalysis, projectIssues))
  }

  const pageLead = document.querySelector('p.text-on-surface-variant.text-base.mt-2')
  setText(
    pageLead as HTMLElement | null,
    aiUnavailable
      ? 'AI unavailable; showing baseline audit career insights.'
      : 'Based on your audit output, these role targets and development vectors are prioritized by evidence found in your code and live app signals.',
  )
}

run().catch((e) => {
  const pageLead = document.querySelector('p.text-on-surface-variant.text-base.mt-2')
  const msg = e instanceof Error ? e.message : 'Failed to load career insights'
  setText(pageLead as HTMLElement | null, msg)
})
