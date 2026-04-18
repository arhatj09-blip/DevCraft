import type { CodebaseAnalysis, RepoCodebaseAnalysis } from '../core/types.js'
import type { DataCollection } from '../audit/collection.js'
import type { AuditReport } from '../audit/report.js'

type CompactRepoContext = {
  repoFullName: string
  repoUrl: string
  stage3Score?: number
  stage3Strengths?: string[]
  stage3Weaknesses?: string[]

  stage1Signals?: {
    hasReadme: boolean
    hasTests: boolean
    hasCI: boolean
    primaryLanguages: string[]
    topLevelFolders: string[]
    pushedAt?: string
  }

  core?: {
    analysisMode: 'full' | 'limited'
    classification: RepoCodebaseAnalysis['classification']
    criticalInsight?: string
    summary: RepoCodebaseAnalysis['summary']
    topFindings: Array<{
      severity: string
      category: string
      title: string
      ruleId?: string
      filePath?: string
      line?: number
      message: string
      evidence?: string
    }>
  }
}

export function buildAiSystemPrompt(): string {
  return [
    'You are an expert engineering reviewer for a GitHub Profile Analyzer.',
    'You will be given structured signals already computed by our pipeline (repo metadata, scoring, and static code findings).',
    'Do NOT invent any facts, files, or repositories that are not present in the input JSON.',
    'Do NOT redo scoring or scanning; your job is interpretation and evidence-based feedback only.',
    '',
    'Process and return ALL layers in one response in this order:',
    'Step 4 — Skill inference: map signals/findings to real-world skills (core strengths + critical weaknesses as skill assessments).',
    'Step 5 — Honest feedback: direct, specific, evidence-based; every item must cite repo+evidence from input.',
    'Step 6 — Level and positioning: level ∈ {Beginner, Intermediate, Advanced}, plus percentile estimate (0-100) and reasoning.',
    'Step 7 — Role matching: ready vs not-ready roles with specific evidence and missing skills.',
    'Step 8 — Skill gap analysis: highest-impact gaps blocking progression, phrased precisely and grounded in evidence.',
    'Step 9 — 90-day roadmap: actionable plan (days 1-30, 31-60, 61-90), each item tied to evidence.',
    'Also include a detailed week-by-week plan (e.g., Week 1–2, Week 3–4, ...), prioritized with the highest ROI items first.',
    '',
    'Output MUST be a valid JSON object and nothing else (no markdown, no code fences).',
    'Required top-level keys:',
    '- overallScore10 (number 0-10)',
    '- strengths (string[])',
    '- weaknesses (string[])',
    '- honestFeedback (array of { statement, repoFullName?, flaws[>=3], reviewGate, whyRejectedInCodeReview, fixes[], levelUpImpact, evidenceExamples[] })',
    '- perRepo (array of { repoFullName, score10, verdict, reasons[], evidenceExamples[] })',
    '- skillMap (object { coreStrengths[], criticalWeaknesses[] })',
    '- levelEstimate (object { level, percentile, reasoning[] })',
    '- roleReadiness (object { ready[], notReady[] }) where each item includes role + why[]',
    '- skillGapAnalysis (array of { gap, whyBlocksProgression, evidenceExamples[], recommendedFixes[]? })',
    '- skillGaps (string[])',
    '- roadmap90Days (object { days1to30[], days31to60[], days61to90[] })',
    '- roadmapWeeks (array of { weekRange, priority, actions[], repoFullName?, evidenceExamples[] })',
    '- brutallyHonestSummary (string)',
    '',
    'Evidence rules:',
    '- Every reason should reference either: stage3Strengths/weaknesses, stage1Signals, core.summary, or a core.topFindings item with filePath/line.',
    '- Every honestFeedback item MUST include at least 3 concrete flaws and at least 1 evidenceExample copied from input (prefer core.topFindings filePath:line).',
    '- Every honestFeedback item MUST explicitly say which code-review bar it fails (reviewGate ∈ {junior, mid-level, senior}) and why.',
    '- Every honestFeedback item MUST include actionable fixes and an explicit levelUpImpact (from/to within {Beginner, Intermediate, Advanced}).',
    '- Every skillGapAnalysis item MUST be precise and technical (NOT vague like "learn system design").',
    '- Each skillGapAnalysis.gap MUST be tied to evidenceExamples from input; prefer filePath:line findings if available.',
    '- The roadmap must be prioritized (highest-impact gaps first) and each roadmapWeeks item MUST include evidenceExamples copied from input.',
    '- If analysisMode=limited for a repo, be explicit that app-architecture judgments are not applicable and focus on what can be inferred (curation, documentation, consistency).',
  ].join('\n')
}

function compactRepoContext(args: {
  repoFullName: string
  repoUrl: string
  collection?: DataCollection
  analysis?: CodebaseAnalysis
  report?: AuditReport
}): CompactRepoContext {
  const { repoFullName, repoUrl, collection, analysis, report } = args

  const stage3 = report?.projects?.find((p) => p.name === repoFullName)
  const stage1 = collection?.github?.repos?.find((r) => r.fullName === repoFullName)
  const core = analysis?.repos?.find((r) => r.repoFullName === repoFullName)

  return {
    repoFullName,
    repoUrl,
    stage3Score: stage3?.score,
    stage3Strengths: stage3?.strengths,
    stage3Weaknesses: stage3?.weaknesses,
    stage1Signals: stage1
      ? {
          hasReadme: stage1.hasReadme,
          hasTests: stage1.hasTests,
          hasCI: stage1.hasCI,
          primaryLanguages: stage1.primaryLanguages,
          topLevelFolders: stage1.topLevelFolders,
          pushedAt: stage1.pushedAt,
        }
      : undefined,
    core: core
      ? {
          analysisMode: core.analysisMode,
          classification: core.classification,
          criticalInsight: core.criticalInsight,
          summary: core.summary,
          topFindings: core.findings.slice(0, 12).map((f) => ({
            severity: f.severity,
            category: f.category,
            title: f.title,
            ruleId: f.ruleId,
            filePath: f.filePath,
            line: f.line,
            message: f.message,
            evidence: f.evidence,
          })),
        }
      : undefined,
  }
}

export function buildAiUserContext(input: {
  github: { kind: 'profile' | 'repo'; target: string; inputUrl: string }
  collection?: DataCollection
  analysis?: CodebaseAnalysis
  report: AuditReport
}) {
  const repos = input.report.projects.map((p) =>
    compactRepoContext({
      repoFullName: p.name,
      repoUrl: p.url,
      collection: input.collection,
      analysis: input.analysis,
      report: input.report,
    }),
  )

  return {
    github: input.github,
    overall: {
      score10: input.report.summary.score,
      level: input.report.summary.level,
      verdict: input.report.summary.verdict,
      strengths: input.report.strengths,
      weaknesses: input.report.weaknesses,
    },
    repos,
    pipelineLimitations: {
      collection: input.collection?.limitations,
      core: input.analysis?.limitations,
    },
  }
}
