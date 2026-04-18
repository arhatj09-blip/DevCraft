import type { RepoSignal } from '../github/analyze.js'
import type { LiveAppAnalysis } from '../liveapp/analyze.js'
import type { CodebaseAnalysis, CodeFinding, Severity } from '../core/types.js'
import type { GitHubModelsChatResult } from '../ai/githubModels.js'

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced'

export type AuditReport = {
  summary: {
    score: number
    label: `${number}/10`
    level: SkillLevel
    verdict: string
  }
  strengths: Array<{ title: string; evidence: string }>
  weaknesses: Array<{
    title: string
    whatsWrong: string
    whyItMatters: string
    evidence?: string
    priority: 'high' | 'medium' | 'low'
  }>
  projects: Array<{
    name: string
    url: string
    score: number
    good: string[]
    bad: string[]

    // STEP 3: Project-level breakdown
    strengths: string[]
    weaknesses: string[]
    issues: Array<{
      title: string
      severity: Severity
      category: CodeFinding['category']
      ruleId?: string
      example: string
    }>
  }>
  codeLevelFindings: string[]
  liveApp?: {
    url: string
    loadTimeMs?: number
    performanceScore?: number
    accessibilityScore?: number
    notes?: string[]
  }
  careerInsights: {
    suitableRoles: Array<{ role: string; why: string[] }>
    notReadyFor: Array<{ role: string; why: string[] }>
  }
  skillGaps: string[]
  roadmap: Array<{ title: string; why: string; action: string; timeline: string }>
  resumeInsights: {
    highlightTheseProjects: Array<{ name: string; reason: string }>
    improveOrRemove: Array<{ name: string; reason: string }>
    bulletRewrite: Array<{ before: string; after: string }>
  }

  // Steps 4–9: GPT-generated layers (GitHub Models)
  ai?: GitHubModelsChatResult

  meta: {
    generatedAt: number
    reposAnalyzed: number
    truncated: boolean
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10))
}

function severityRank(sev: Severity): number {
  if (sev === 'high') return 3
  if (sev === 'medium') return 2
  if (sev === 'low') return 1
  return 0
}

function formatFindingExample(f: CodeFinding): string {
  const at = f.filePath ? `${f.filePath}${typeof f.line === 'number' ? `:${f.line}` : ''}` : 'N/A'
  const evidence = f.evidence ? ` — ${f.evidence}` : ''
  return `${at}: ${f.message}${evidence}`
}

function pickIssueExamples(findings: CodeFinding[], limit = 4): AuditReport['projects'][number]['issues'] {
  const sorted = [...findings].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity) || (a.filePath ?? '').localeCompare(b.filePath ?? ''),
  )
  return sorted.slice(0, limit).map((f) => ({
    title: f.title,
    severity: f.severity,
    category: f.category,
    ruleId: f.ruleId,
    example: formatFindingExample(f),
  }))
}

function computeRepoScore(repo: RepoSignal): { score: number; good: string[]; bad: string[] } {
  let score = 3.0
  const good: string[] = []
  const bad: string[] = []

  if (repo.hasReadme) {
    score += 1
    good.push('README present')
    if ((repo.readmeLength ?? 0) >= 300) {
      score += 0.5
      good.push('README has meaningful content')
    }
  } else {
    score -= 0.5
    bad.push('No README detected')
  }

  if (repo.hasTests) {
    score += 2
    good.push('Tests detected')
  } else {
    score -= 1
    bad.push('No test coverage signals')
  }

  if (repo.hasCI) {
    score += 1
    good.push('CI workflow detected')
  } else {
    bad.push('No CI workflow detected')
  }

  const pushedAt = repo.pushedAt ? Date.parse(repo.pushedAt) : undefined
  if (pushedAt) {
    const days = (Date.now() - pushedAt) / (1000 * 60 * 60 * 24)
    if (days <= 90) {
      score += 1
      good.push('Recent commits (last 90 days)')
    } else if (days > 365) {
      score -= 0.5
      bad.push('Stale activity (no recent commits)')
    }
  }

  if (repo.topLevelFolders.includes('src')) {
    score += 0.5
    good.push('Has a src/ directory')
  }

  if (repo.primaryLanguages.length > 0) {
    good.push(`Primary languages: ${repo.primaryLanguages.join(', ')}`)
  }

  return {
    score: clampScore(score),
    good: good.slice(0, 2),
    bad: bad.slice(0, 2),
  }
}

function levelFromScore(score: number): SkillLevel {
  if (score < 4) return 'Beginner'
  if (score < 7) return 'Intermediate'
  return 'Advanced'
}

export function buildAuditReport(input: {
  repos: RepoSignal[]
  truncated: boolean
  liveApp?: LiveAppAnalysis
  analysis?: CodebaseAnalysis
}): AuditReport {
  const perRepo = input.repos.map((r) => ({ repo: r, ...computeRepoScore(r) }))
  const analysisByRepo = new Map<string, CodebaseAnalysis['repos'][number]>(
    (input.analysis?.repos ?? []).map((r) => [r.repoFullName, r]),
  )

  const avg =
    perRepo.length === 0
      ? 0
      : perRepo.reduce((sum, r) => sum + r.score, 0) / perRepo.length

  const score = clampScore(avg)
  const level = levelFromScore(score)

  const hasTestsRatio =
    input.repos.length === 0
      ? 0
      : input.repos.filter((r) => r.hasTests).length / input.repos.length

  const hasReadmeRatio =
    input.repos.length === 0
      ? 0
      : input.repos.filter((r) => r.hasReadme).length / input.repos.length

  const strengths: AuditReport['strengths'] = []
  if (hasTestsRatio >= 0.5) {
    strengths.push({
      title: 'Testing signals present',
      evidence: `${Math.round(hasTestsRatio * 100)}% of analyzed repos contain tests or test-like files.`,
    })
  }
  if (hasReadmeRatio >= 0.6) {
    strengths.push({
      title: 'Documentation discipline',
      evidence: `${Math.round(hasReadmeRatio * 100)}% of analyzed repos include a README.`,
    })
  }
  const langs = new Set(input.repos.flatMap((r) => r.primaryLanguages))
  if (langs.size > 0) {
    strengths.push({
      title: 'Clear language focus',
      evidence: `Languages observed: ${Array.from(langs).slice(0, 6).join(', ')}.`,
    })
  }

  const weaknesses: AuditReport['weaknesses'] = []
  if (hasTestsRatio < 0.35) {
    weaknesses.push({
      title: 'No test coverage signals',
      whatsWrong: 'Most repos do not show unit/integration test files or test folders.',
      whyItMatters: 'Without tests, regressions ship easily and refactors become risky.',
      evidence: `${Math.round(hasTestsRatio * 100)}% of analyzed repos show tests.`,
      priority: 'high',
    })
  }
  if (hasReadmeRatio < 0.5) {
    weaknesses.push({
      title: 'Weak README/documentation signals',
      whatsWrong: 'Many repos have no README or a very short one.',
      whyItMatters: 'Hiring teams use README clarity as a proxy for communication and maintainability.',
      evidence: `${Math.round(hasReadmeRatio * 100)}% of analyzed repos have a README.`,
      priority: 'medium',
    })
  }

  const codeLevelFindings: string[] = []
  const largestAcross = input.repos
    .flatMap((r) => r.largestFiles.map((f) => ({ repo: r.fullName, ...f })))
    .sort((a, b) => b.size - a.size)
    .slice(0, 4)

  for (const f of largestAcross) {
    if (f.size >= 80_000) {
      codeLevelFindings.push(
        `Large file: ${f.repo}/${f.path} (~${Math.round(f.size / 1024)} KB) — consider splitting for readability/testability.`,
      )
    }
  }

  if (codeLevelFindings.length === 0 && input.repos.length > 0) {
    const sample = input.repos[0]
    if (sample.largestFiles[0]) {
      const lf = sample.largestFiles[0]
      codeLevelFindings.push(
        `Largest file sample: ${sample.fullName}/${lf.path} (~${Math.round(lf.size / 1024)} KB).`,
      )
    }
  }

  const verdict =
    weaknesses.find((w) => w.priority === 'high')?.title === 'No test coverage signals'
      ? 'Good project activity signals, but reliability practices are weak (tests missing).'
      : score >= 7
        ? 'Strong overall engineering signals with solid structure and delivery habits.'
        : 'Some strong signals, but fundamentals are inconsistent across projects.'

  const projects: AuditReport['projects'] = perRepo.map((r) => {
    const core = analysisByRepo.get(r.repo.fullName)
    const strengths: string[] = [...r.good]
    const weaknesses: string[] = [...r.bad]

    if (core) {
      if (core.analysisMode === 'limited') {
        strengths.unshift(`Analysis Limited: classified as ${core.classification.repoType}.`)
        if (core.summary.hasReadme) strengths.push('Documentation signals: README present.')
        if (core.summary.hasCI) strengths.push('Automation signals: CI detected.')
        if (!core.summary.hasTests) weaknesses.push('Not a software project; tests are not a meaningful signal here.')
      } else {
        if (core.summary.hasCI) strengths.push('CI workflow detected.')
        if (core.summary.eslintIssues <= 3 && core.summary.filesSampled > 0) strengths.push('Low lint issue count in sampled JS/TS files.')
        if (core.summary.longLines > 60) weaknesses.push(`Readability: many long lines detected (${core.summary.longLines}).`)
        if (core.summary.secretFindings > 0) weaknesses.push(`Security: possible secrets/signature patterns found (${core.summary.secretFindings}).`)
        if (core.summary.unsafePatternFindings > 0)
          weaknesses.push(`Security: unsafe patterns (eval/innerHTML/etc) found (${core.summary.unsafePatternFindings}).`)
        if (!core.summary.hasTests) weaknesses.push('No test coverage signals in repo.')
      }
    }

    const issues = core ? pickIssueExamples(core.findings, 5) : []

    return {
      name: r.repo.fullName,
      url: r.repo.htmlUrl,
      score: r.score,
      good: r.good,
      bad: r.bad,
      strengths: strengths.slice(0, 6),
      weaknesses: weaknesses.slice(0, 6),
      issues,
    }
  })

  projects.sort((a, b) => b.score - a.score)

  const suitableRoles: AuditReport['careerInsights']['suitableRoles'] = []
  const notReadyFor: AuditReport['careerInsights']['notReadyFor'] = []

  const mostlyJsTs = Array.from(langs).some((l) => ['TypeScript', 'JavaScript'].includes(l))

  if (level === 'Beginner') {
    suitableRoles.push({
      role: 'Intern / Junior Developer (mentored)',
      why: ['Has repos to review', 'Needs stronger reliability and delivery signals'],
    })
  } else if (level === 'Intermediate') {
    suitableRoles.push({
      role: mostlyJsTs ? 'Junior Frontend Developer' : 'Junior Developer',
      why: ['Project structure signals are present', 'Can ship features with guidance'],
    })
  } else {
    suitableRoles.push({
      role: mostlyJsTs ? 'Frontend Developer' : 'Software Engineer',
      why: ['Consistent repo quality signals', 'Better engineering hygiene across projects'],
    })
  }

  if (hasTestsRatio < 0.35) {
    notReadyFor.push({
      role: 'Backend Developer (mid-level)',
      why: ['Testing signals are weak', 'Reliability practices would not pass a strict review'],
    })
  }

  const skillGaps: string[] = []
  if (hasTestsRatio < 0.5) skillGaps.push('Add unit/integration testing and enforce it via CI.')
  if (hasReadmeRatio < 0.7) skillGaps.push('Standardize README quality: setup, scripts, architecture, and tradeoffs.')

  const roadmap: AuditReport['roadmap'] = [
    {
      title: 'Add Unit Testing',
      why: 'Your repos show weak test signals, which hurts reliability and hiring confidence.',
      action: 'Add a test runner (Vitest/Jest) and cover the core business logic first (happy + error paths).',
      timeline: 'Weeks 1–3',
    },
    {
      title: 'Improve API/Error Discipline',
      why: 'Clean error handling and validation is a common code review gate.',
      action: 'Standardize request validation, error shapes, and status codes across endpoints.',
      timeline: 'Weeks 4–6',
    },
    {
      title: 'Project Documentation Upgrade',
      why: 'README quality is a fast proxy for maintainability and collaboration.',
      action: 'For top 2 projects: add README sections (setup, scripts, features, limitations, screenshots).',
      timeline: 'Weeks 7–9',
    },
  ]

  const highlightTheseProjects = projects.slice(0, 2).map((p) => ({
    name: p.name,
    reason: 'Best signals across docs/tests/structure relative to other repos.',
  }))

  const improveOrRemove = projects
    .slice(-2)
    .map((p) => ({ name: p.name, reason: 'Lowest score; missing testing/docs/CI signals.' }))

  const bulletRewrite: AuditReport['resumeInsights']['bulletRewrite'] = [
    {
      before: 'Built a website using React',
      after: 'Developed a React application with structured routing/components and a backend audit API, exposing job-based progress and results endpoints.',
    },
  ]

  return {
    summary: {
      score,
      label: `${score}/10`,
      level,
      verdict,
    },
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 5),
    projects,
    codeLevelFindings: codeLevelFindings.slice(0, 5),
    liveApp: input.liveApp
      ? {
          url: input.liveApp.url,
          loadTimeMs: input.liveApp.loadTimeMs,
          performanceScore: input.liveApp.performanceScore,
          accessibilityScore: input.liveApp.accessibilityScore,
          notes: input.liveApp.notes,
        }
      : undefined,
    careerInsights: {
      suitableRoles,
      notReadyFor,
    },
    skillGaps: skillGaps.slice(0, 6),
    roadmap: roadmap.slice(0, 3),
    resumeInsights: {
      highlightTheseProjects,
      improveOrRemove,
      bulletRewrite,
    },
    meta: {
      generatedAt: Date.now(),
      reposAnalyzed: input.repos.length,
      truncated: input.truncated,
    },
  }
}
