import { apiGet } from './_shared/api'
import {
  decorateInternalHtmlLinksWithJobId,
  ensureJobIdInUrl,
  requireJobIdOrRedirect,
  setLastJobId,
} from './_shared/auditSession'
import { escapeHtml, setHtml, setText } from './_shared/dom'

type AuditReport = {
  roadmap?: Array<{ title: string; why: string; action: string; timeline: string }>
  ai?: { modelUsed?: string; response: any }
}

type RoadmapItem = {
  weeks: string
  title: string
  priority?: 'high' | 'medium' | 'low'
  why?: string
  action?: string
}

type AIRoadmapWeek = {
  weekRange: string
  priority: 'high' | 'medium' | 'low'
  actions: string[]
  evidenceExamples?: string[]
}

type ReportRoadmapItem = {
  title: string
  why: string
  timeline: string
}

function parseAIRoadmapWeeks(value: unknown): AIRoadmapWeek[] {
  if (!value || !Array.isArray(value)) return []
  return value
    .map((v: any) => {
      if (!v || typeof v !== 'object' || typeof v.weekRange !== 'string' || !Array.isArray(v.actions)) return null
      const actions = v.actions.filter((a: any) => typeof a === 'string' && a.trim())
      const evidence = Array.isArray(v.evidenceExamples) ? v.evidenceExamples.filter((e: any) => typeof e === 'string' && e.trim()) : []
      const priority = (v.priority ?? 'medium').toLowerCase()
      if (!['high', 'medium', 'low'].includes(priority)) return null
      return { weekRange: v.weekRange, priority: priority as 'high' | 'medium' | 'low', actions, evidenceExamples: evidence }
    })
    .filter(Boolean) as AIRoadmapWeek[]
}

function parseReportRoadmap(value: unknown): ReportRoadmapItem[] {
  if (!value || !Array.isArray(value)) return []
  return value
    .map((v: any) => {
      if (!v || typeof v !== 'object' || typeof v.title !== 'string' || typeof v.timeline !== 'string') return null
      const why = typeof v.why === 'string' ? v.why : ''
      return { title: v.title, why, timeline: v.timeline }
    })
    .filter(Boolean) as ReportRoadmapItem[]
}

function generateWhyFromAI(aiResponse: any, weekIdx: number, aiWeek?: AIRoadmapWeek, reportItem?: ReportRoadmapItem): string {
  // Generate context-aware "why" based on the roadmap week's actions and priority
  if (aiWeek) {
    const { actions, priority, evidenceExamples } = aiWeek
    const firstAction = actions?.[0] || ''
    const hasSecurityFocus = firstAction.toLowerCase().includes('sanitization') || firstAction.toLowerCase().includes('security')
    const hasRefactoringFocus = firstAction.toLowerCase().includes('refactor')
    const hasAuditFocus = firstAction.toLowerCase().includes('audit')
    const hasReviewFocus = firstAction.toLowerCase().includes('review')
    const hasDocumentationFocus = firstAction.toLowerCase().includes('document')

    switch (weekIdx) {
      case 0: {
        // Week 1-2: Upfront Audit & Research
        if (hasAuditFocus) {
          return `Starting with a thorough audit establishes a clear baseline of issues. By identifying all problem areas upfront—${evidenceExamples?.[0] ? 'such as ' + evidenceExamples[0].split(':')[0] : 'like long functions and security patterns'}—you can prioritize fixes strategically and prevent technical debt accumulation.`
        }
        break
      }
      case 1: {
        // Week 3-4: Active Refactoring & Implementation
        if (hasRefactoringFocus || hasSecurityFocus) {
          return `Implementing fixes now prevents these issues from blocking your progress to senior and lead roles. Each refactored function improves code readability, reduces maintenance overhead, and demonstrates mastery of clean code principles—critical for advancement.`
        }
        break
      }
      case 2: {
        // Week 5-6: Continued Refactoring & Team Alignment
        if (hasRefactoringFocus) {
          return `Continuing refactoring momentum while training your team ensures consistency across the codebase. This phase solidifies best practices and prevents teammates from introducing similar issues, creating a culture of maintainable, secure code.`
        }
        break
      }
      case 3: {
        // Week 7-8: Code Review & Verification
        if (hasReviewFocus) {
          return `Conducting thorough code reviews validates that refactored code meets readability and maintainability standards. This verification step catches regressions early, ensures quality gates are met, and prepares you for senior-level code review responsibilities.`
        }
        break
      }
      case 4: {
        // Week 9-10: Security Audit & Documentation
        if (hasDocumentationFocus || hasSecurityFocus) {
          return `Comprehensive security audits and documentation of changes create a permanent record of improvements and prevent regression. This final phase demonstrates systematic thinking, attention to detail, and knowledge transfer—essential qualities for leadership.`
        }
        break
      }
      default: {
        // Generic contextual why for other weeks
        const isPriority = priority === 'high'
        const focusArea = firstAction.substring(0, 40)
        return `${isPriority ? 'This high-priority phase' : 'This phase'} addresses critical gaps in your codebase. By focusing on ${focusArea}..., you'll strengthen your technical foundation and demonstrate commitment to continuous improvement.`
      }
    }
  }

  // Fallback to report why or AI response
  return reportItem?.why || aiResponse?.brutallyHonestSummary || ''
}

function mergeRoadmapData(aiWeeks: AIRoadmapWeek[], reportItems: ReportRoadmapItem[], aiResponse?: any): RoadmapItem[] {
  // If we have AI weeks data, use it as primary source
  if (aiWeeks.length > 0) {
    return aiWeeks.map((week, idx) => {
      // Try to match with report item by timeline overlap or index
      const report = reportItems[idx]

      // Generate why from week's actions and context (NEW: pass aiWeek to generate contextual why)
      const why = generateWhyFromAI(aiResponse, idx, week, report)

      // Extract title: prefer report title, then derive from first action
      const title = report?.title || week.actions[0] || 'Roadmap Action'

      // Combine actions
      const action = week.actions.length ? week.actions.join(' • ') : ''

      return {
        weeks: week.weekRange,
        title,
        priority: week.priority,
        why,
        action,
      }
    })
  }

  // Fallback: use report roadmap
  if (reportItems.length > 0) {
    return reportItems.map((item, idx) => {
      const priority: RoadmapItem['priority'] = idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low'
      return {
        weeks: item.timeline,
        title: item.title,
        why: item.why,
        action: '',
        priority,
      }
    })
  }

  return []
}

function chipBgByPriority(priority?: string): string {
  if (!priority) return 'bg-surface-container-high text-on-surface-variant'
  const p = priority.toLowerCase()
  if (p === 'high') return 'bg-tertiary-container/10 text-tertiary'
  if (p === 'medium') return 'bg-surface-container-high text-on-surface-variant'
  return 'bg-surface-container-high text-on-surface-variant'
}

function badgeBgByIndex(idx: number): string {
  if (idx === 0) return 'bg-primary-fixed text-on-primary-fixed'
  if (idx === 1) return 'bg-secondary-fixed text-on-secondary-fixed'
  return 'bg-surface-variant text-on-surface-variant'
}

function renderTimeline(items: RoadmapItem[]): string {
  const top = items.slice(0, 10) // Show up to 10 roadmap items

  return top
    .map((it, idx) => {
      const badgeBg = badgeBgByIndex(idx)
      const weeks = it.weeks || `Week ${idx + 1}`
      const priority = it.priority ? `Priority: ${it.priority.charAt(0).toUpperCase()}${it.priority.slice(1)}` : ''
      const priorityClass = chipBgByPriority(it.priority)

      const why = it.why ?? ''
      const action = it.action ?? ''

      const accent =
        idx === 0
          ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary-container rounded-l-lg opacity-80"></div>'
          : ''

      return `
        <div class="bg-surface-container rounded-lg p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 relative group">
          ${accent}
          <div class="md:w-1/3 shrink-0 flex flex-col items-start">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 ${badgeBg} text-xs font-bold font-label rounded-full mb-4">
              <span class="material-symbols-outlined text-[14px]">calendar_today</span>
              ${escapeHtml(weeks)}
            </span>
            <h2 class="font-headline text-2xl font-bold text-on-surface mb-2 leading-tight">${escapeHtml(it.title)}</h2>
            ${priority ? `<span class="inline-block px-2 py-0.5 ${priorityClass} text-xs font-semibold rounded mt-1">${escapeHtml(priority)}</span>` : ''}
          </div>
          <div class="flex-1 flex flex-col gap-5">
            <div class="bg-surface-container-lowest p-5 rounded-lg">
              <h3 class="flex items-center gap-2 text-sm font-bold text-on-surface mb-2 font-headline uppercase tracking-wide">
                <span class="material-symbols-outlined text-[18px] text-secondary">psychology</span>
                Why it matters
              </h3>
              <p class="text-on-surface-variant text-sm leading-relaxed">${escapeHtml(why)}</p>
            </div>
            <div class="bg-surface-bright p-5 rounded-lg border border-outline-variant/15">
              <h3 class="flex items-center gap-2 text-sm font-bold text-on-surface mb-2 font-headline uppercase tracking-wide">
                <span class="material-symbols-outlined text-[18px] text-primary">play_arrow</span>
                Action Steps
              </h3>
              <div class="text-on-surface-variant text-sm space-y-1.5">
                ${action
                  .split(' • ')
                  .map((step: string) => `<div class="flex gap-2"><span class="text-primary">→</span><span>${escapeHtml(step.trim())}</span></div>`)
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      `
    })
    .join('')
}

async function run() {
  const jobId = requireJobIdOrRedirect('landing_page.html')
  setLastJobId(jobId)
  ensureJobIdInUrl(jobId)
  decorateInternalHtmlLinksWithJobId(jobId)

  const report = await apiGet<AuditReport>(`/api/audit/${encodeURIComponent(jobId)}/result`)
  const ai = report.ai?.response

  const aiUnavailable = report.ai?.modelUsed === 'unavailable'
  if (aiUnavailable) {
    const lead = document.querySelector('p.text-on-surface-variant.text-lg.max-w-2xl')
    setText(lead as HTMLElement | null, 'AI unavailable; showing baseline audit roadmap.')
  }

  // Parse both sources
  const aiWeeks = parseAIRoadmapWeeks(ai?.roadmapWeeks)
  const reportItems = parseReportRoadmap(report.roadmap)

  // Merge intelligently: AI weeks provide structure + actions + priority, AI response provides why explanations
  const roadmap = mergeRoadmapData(aiWeeks, reportItems, ai)

  const host = document.getElementById('roadmapTimeline')
  if (host && roadmap.length) {
    setHtml(host, renderTimeline(roadmap))
    return
  }

  // Last-resort: show a clear message (should be rare because report.roadmap is normally present).
  const lead = document.querySelector('p.text-on-surface-variant.text-lg.max-w-2xl')
  setText(lead as HTMLElement | null, 'No roadmap data available for this audit.')
}

run().catch((e) => {
  const msg = e instanceof Error ? e.message : 'Failed to load roadmap'
  const lead = document.querySelector('p.text-on-surface-variant.text-lg.max-w-2xl')
  setText(lead as HTMLElement | null, msg)
})
