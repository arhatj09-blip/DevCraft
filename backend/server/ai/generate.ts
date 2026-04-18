import type { CodebaseAnalysis } from '../core/types.js'
import type { DataCollection } from '../audit/collection.js'
import type { AuditReport } from '../audit/report.js'
import { getCache, setCache } from './cache.js'
import { callWithFallback, type GitHubModelsChatResult } from './githubModels.js'
import { buildAiSystemPrompt, buildAiUserContext } from './prompt.js'
import { aiInsightsResponseSchema, type AiInsightsResponse } from './schema.js'

const TTL_2H_MS = 2 * 60 * 60 * 1000

export function makeAiCacheKey(github: { kind: 'profile' | 'repo'; target: string }): string {
  return github.kind === 'profile' ? `user:${github.target}` : `repo:${github.target}`
}

export function getCachedAiForUsername(username: string): GitHubModelsChatResult | undefined {
  const key = makeAiCacheKey({ kind: 'profile', target: username })
  const cached = getCache<GitHubModelsChatResult>(key)
  if (!cached) return undefined
  return { ...cached, cached: true }
}

function mapLevel(level: AuditReport['summary']['level']): AiInsightsResponse['levelEstimate']['level'] {
  if (level === 'Beginner') return 'Beginner'
  if (level === 'Intermediate') return 'Intermediate'
  return 'Advanced'
}

function summarizeStrengthItems(report: AuditReport): string[] {
  return report.strengths.map((s) => (s.evidence ? `${s.title} — ${s.evidence}` : s.title))
}

function summarizeWeaknessItems(report: AuditReport): string[] {
  return report.weaknesses.map((w) => {
    const evidence = w.evidence ? ` — ${w.evidence}` : ''
    return `${w.title}${evidence}`
  })
}

function makeFallbackAiResponse(args: {
  report: AuditReport
  github: { kind: 'profile' | 'repo'; target: string }
  errorMessage: string
}): unknown {
  const { report, github, errorMessage } = args
  const overallScore10 = report.summary.score
  const strengths = summarizeStrengthItems(report)
  const weaknesses = summarizeWeaknessItems(report)

  const honestFeedback = report.projects
    .flatMap((p) => {
      const evidence = p.issues.map((i) => i.example).slice(0, 4)
      const weaknessSignals = p.weaknesses.slice(0, 6)

      const flaws: string[] = []
      const fixes: string[] = []

      const hasNoTests = weaknessSignals.some((w) => w.toLowerCase().includes('test'))
      if (hasNoTests) {
        flaws.push('No automated tests to prevent regressions (missing unit/integration coverage signals).')
        fixes.push('Add a test runner (Vitest/Jest) and cover core logic + edge cases; enforce via CI.')
      }

      const hasNoCI = weaknessSignals.some((w) => w.toLowerCase().includes('no ci'))
      if (hasNoCI) {
        flaws.push('No CI workflow enforcing lint/tests on PRs.')
        fixes.push('Add GitHub Actions to run lint + tests on PRs; require checks to pass before merge.')
      }

      const hasUnsafe = p.issues.some((i) => i.example.toLowerCase().includes('innerhtml') || i.example.toLowerCase().includes('eval'))
      if (hasUnsafe) {
        flaws.push('Insecure patterns detected (e.g., unsafe DOM sinks like innerHTML/eval) without mitigation.')
        fixes.push('Replace unsafe DOM sinks with safe APIs; sanitize if HTML is required; add regression tests.')
      }

      // Ensure at least 3 flaws even if heuristics miss something.
      while (flaws.length < 3) {
        flaws.push('Engineering hygiene is inconsistent across projects (missing repeatable quality gates).')
      }

      const from = report.summary.level
      const levelUp = from === 'Beginner' ? { from: 'Beginner', to: 'Intermediate' } : from === 'Intermediate' ? { from: 'Intermediate', to: 'Advanced' } : { from: 'Advanced', to: 'Advanced' }

      const statement =
        `In ${p.name}, a senior engineer would reject this in code review until you address these specific issues.`

      const ev = evidence.length ? evidence : weaknessSignals.length ? weaknessSignals : ['N/A']

      return [
        {
          statement,
          repoFullName: p.name,
          flaws,
          reviewGate: 'senior',
          whyRejectedInCodeReview:
            'These issues increase security risk and reduce reliability/maintainability, and they indicate missing production-grade practices (tests + automation + safe coding patterns).',
          fixes: fixes.length ? fixes : ['Add tests, CI, and remove unsafe patterns.'],
          levelUpImpact: {
            from: levelUp.from,
            to: levelUp.to,
            reasoning: [
              'Fixing these moves your work from “it runs” to “it is safe and maintainable”.',
              'Tests + CI + secure coding are common gates for progression.',
            ],
          },
          evidenceExamples: ev,
        },
      ]
    })
    .slice(0, 8)

  const skillGapAnalysis = report.projects
    .flatMap((p) => {
      const evidence = p.issues.map((i) => i.example).slice(0, 3)
      const gaps: Array<{ gap: string; whyBlocksProgression: string; evidenceExamples: string[]; recommendedFixes?: string[] }> = []

      const hasInnerHtml = p.issues.some((i) => i.title.toLowerCase().includes('innerhtml') || i.example.toLowerCase().includes('innerhtml'))
      if (hasInnerHtml) {
        gaps.push({
          gap: 'Client-side security: unsafe DOM sinks (innerHTML) without sanitization',
          whyBlocksProgression:
            'This is a common mid-level review blocker because it can introduce XSS vulnerabilities and indicates missing secure coding habits.',
          evidenceExamples: evidence.length ? evidence : p.weaknesses.slice(0, 1),
          recommendedFixes: ['Replace innerHTML with safe DOM APIs (textContent/createElement)', 'If HTML is required, sanitize with a vetted library'],
        })
      }

      if (p.weaknesses.some((w) => w.toLowerCase().includes('no test'))) {
        gaps.push({
          gap: 'Reliability: no automated tests or test coverage signal',
          whyBlocksProgression:
            'Without tests, refactors are risky and teams can’t trust changes; this blocks moving beyond beginner/junior roles in many orgs.',
          evidenceExamples: p.weaknesses.filter((w) => w.toLowerCase().includes('test')).slice(0, 2),
          recommendedFixes: ['Add a unit test runner and cover core logic paths', 'Run tests in CI to prevent regressions'],
        })
      }

      if (p.weaknesses.some((w) => w.toLowerCase().includes('no ci'))) {
        gaps.push({
          gap: 'Delivery hygiene: missing CI workflow to enforce checks',
          whyBlocksProgression:
            'CI is a baseline expectation for collaborative teams; without it, quality gates (tests/lint) are not consistently enforced.',
          evidenceExamples: p.weaknesses.filter((w) => w.toLowerCase().includes('ci')).slice(0, 2),
          recommendedFixes: ['Add GitHub Actions to run lint + tests on PRs', 'Add a status badge to README and enforce branch protection'],
        })
      }

      return gaps.map((g) => ({
        ...g,
        evidenceExamples: g.evidenceExamples.length ? g.evidenceExamples : ['N/A'],
      }))
    })
    .slice(0, 8)

  const topProject = report.projects[0]
  const topEvidence = topProject?.issues?.map((i) => i.example).slice(0, 2) ?? []
  const roadmapWeeks = [
    {
      weekRange: 'Week 1–2',
      priority: 'high',
      actions: ['Add a minimal test runner and write 10–20 focused unit tests for the most reused functions/components.'],
      repoFullName: topProject?.name,
      evidenceExamples: topEvidence.length ? topEvidence : ['No test coverage signals'],
    },
    {
      weekRange: 'Week 3–4',
      priority: 'high',
      actions: ['Set up CI to run lint + tests on every PR; fail builds on regressions.'],
      repoFullName: topProject?.name,
      evidenceExamples: ['No CI workflow detected'],
    },
    {
      weekRange: 'Week 5–6',
      priority: 'high',
      actions: ['Fix insecure patterns (e.g., innerHTML/eval) and add regression tests for the fixes.'],
      repoFullName: topProject?.name,
      evidenceExamples: topEvidence.length ? topEvidence : ['N/A'],
    },
    {
      weekRange: 'Week 7–8',
      priority: 'medium',
      actions: ['Refactor the top 3 most complex/long functions into smaller modules with clearer names and boundaries.'],
      repoFullName: topProject?.name,
      evidenceExamples: topEvidence.length ? topEvidence : ['N/A'],
    },
    {
      weekRange: 'Week 9–10',
      priority: 'medium',
      actions: ['Improve README with setup, scripts, architecture notes, and tradeoffs; add screenshots/GIFs for projects.'],
      repoFullName: topProject?.name,
      evidenceExamples: ['README present'],
    },
    {
      weekRange: 'Week 11–12',
      priority: 'low',
      actions: ['Polish: consistent formatting, lint rules, and small UX improvements; document limitations and next steps.'],
      repoFullName: topProject?.name,
      evidenceExamples: ['Low lint issue count in sampled JS/TS files.'],
    },
  ]

  const perRepo = report.projects.map((p) => ({
    repoFullName: p.name,
    score10: p.score,
    verdict:
      p.score >= 7
        ? 'Strong signals relative to the rest of the portfolio.'
        : p.score >= 4
          ? 'Mixed signals; good foundation but inconsistent hygiene.'
          : 'Weak signals; fundamentals are missing or unclear.',
    reasons: [...p.strengths, ...p.weaknesses].slice(0, 8),
    evidenceExamples: p.issues.map((i) => i.example).slice(0, 6),
  }))

  const percentile = Math.max(0, Math.min(100, Math.round((overallScore10 / 10) * 100)))

  return {
    overallScore10,
    strengths,
    weaknesses,
    honestFeedback: honestFeedback.length > 0 ? honestFeedback : [
      {
        statement: `AI layer unavailable (${errorMessage}). Falling back to deterministic feedback derived from existing pipeline signals.`,
        flaws: ['AI unavailable: no additional reviewer-grade flaws could be generated.','AI unavailable: no additional reviewer-grade flaws could be generated.','AI unavailable: no additional reviewer-grade flaws could be generated.'],
        reviewGate: 'senior',
        whyRejectedInCodeReview: 'The AI layer failed; only baseline pipeline signals are available.',
        fixes: ['Retry when AI is available'],
        levelUpImpact: { from: mapLevel(report.summary.level), to: mapLevel(report.summary.level), reasoning: ['AI unavailable; no level-up inference possible.'] },
        evidenceExamples: ['N/A'],
      },
    ],
    perRepo,
    skillMap: {
      coreStrengths: strengths.slice(0, 6),
      criticalWeaknesses: weaknesses.slice(0, 6),
    },
    levelEstimate: {
      level: mapLevel(report.summary.level),
      percentile,
      reasoning: [
        `Derived from pipeline Stage 3 score=${overallScore10}/10 and repo hygiene signals.`,
        ...strengths.slice(0, 2),
        ...weaknesses.slice(0, 2),
      ].slice(0, 6),
    },
    roleReadiness: {
      ready: report.careerInsights.suitableRoles.map((r) => ({ role: r.role, why: r.why })),
      notReady: report.careerInsights.notReadyFor.map((r) => ({ role: r.role, why: r.why })),
    },
    skillGapAnalysis: skillGapAnalysis.length
      ? skillGapAnalysis
      : [
          {
            gap: 'AI unavailable: skill gap analysis could not be generated',
            whyBlocksProgression: 'The AI layer failed; no additional gap inference was possible beyond pipeline heuristics.',
            evidenceExamples: ['N/A'],
            recommendedFixes: ['Retry when AI is available'],
          },
        ],
    skillGaps: report.skillGaps,
    roadmap90Days: {
      days1to30: report.roadmap.slice(0, 1).map((r) => `${r.title}: ${r.action}`),
      days31to60: report.roadmap.slice(1, 2).map((r) => `${r.title}: ${r.action}`),
      days61to90: report.roadmap.slice(2, 3).map((r) => `${r.title}: ${r.action}`),
    },
    roadmapWeeks,
    brutallyHonestSummary:
      `AI layer unavailable (${errorMessage}). Returning deterministic fallback based on existing pipeline signals for ${github.kind}:${github.target}. ` +
      report.summary.verdict,
  }
}

function buildAiRepairSystemPrompt(): string {
  return [
    'You are a strict JSON repair tool.',
    'You will be given an invalid or schema-nonconforming JSON object.',
    'Your task: output a corrected JSON object that conforms to the required schema.',
    'Do NOT add prose. Do NOT include markdown. Output JSON only.',
    '',
    'Key rules:',
    '- Preserve meaning as much as possible from the provided object.',
    '- If a required field is missing, infer it ONLY from the provided context; otherwise use a safe placeholder that is still specific and evidence-based.',
    '- Ensure honestFeedback items include: statement, flaws (>=3), reviewGate, whyRejectedInCodeReview, fixes, levelUpImpact {from,to,reasoning}, evidenceExamples.',
    '- Ensure skillGapAnalysis and roadmapWeeks exist and include evidenceExamples arrays.',
  ].join('\n')
}

async function validateOrRepairAiResponse(args: {
  initial: unknown
  systemForRepair: string
  userContext: unknown
}): Promise<AiInsightsResponse> {
  const first = aiInsightsResponseSchema.safeParse(args.initial)
  if (first.success) return first.data

  const issue = first.error.issues[0]
  const path = issue?.path?.length ? issue.path.join('.') : '(root)'

  // One repair attempt via the model.
  const repaired = await callWithFallback({
    system: args.systemForRepair,
    userJson: {
      schemaHint: {
        requiredTopLevelKeys: [
          'overallScore10',
          'strengths',
          'weaknesses',
          'honestFeedback',
          'perRepo',
          'skillMap',
          'levelEstimate',
          'roleReadiness',
          'skillGapAnalysis',
          'skillGaps',
          'roadmap90Days',
          'roadmapWeeks',
          'brutallyHonestSummary',
        ],
      },
      validationError: { message: issue?.message ?? 'invalid', path },
      invalidObject: args.initial,
      originalUserContext: args.userContext,
    },
  })

  const second = aiInsightsResponseSchema.safeParse(repaired.response)
  if (second.success) return second.data

  const issue2 = second.error.issues[0]
  const path2 = issue2?.path?.length ? issue2.path.join('.') : '(root)'
  throw new Error(`AI response schema invalid after repair: ${issue2?.message ?? 'invalid'} at ${path2}`)
}

export async function generateAiFeedback(input: {
  github: { kind: 'profile' | 'repo'; target: string; inputUrl: string }
  collection?: DataCollection
  analysis?: CodebaseAnalysis
  report: AuditReport
}): Promise<GitHubModelsChatResult> {
  const cacheKey = makeAiCacheKey({ kind: input.github.kind, target: input.github.target })

  // Cache is critical for profiles; we also cache single-repo requests.
  const cached = getCache<GitHubModelsChatResult>(cacheKey)
  if (cached) return { ...cached, cached: true }

  const system = buildAiSystemPrompt()
  const userJson = buildAiUserContext(input)

  const startedAt = Date.now()
  try {
    const result = await callWithFallback({ system, userJson })

    const validated = await validateOrRepairAiResponse({
      initial: result.response,
      systemForRepair: buildAiRepairSystemPrompt(),
      userContext: userJson,
    })

    const payload: GitHubModelsChatResult = {
      modelUsed: result.modelUsed,
      cached: false,
      usage: result.usage,
      response: validated,
    }

    setCache(cacheKey, payload, TTL_2H_MS)

    const ms = Date.now() - startedAt
    const usage = payload.usage
    console.log(
      `[ai] model=${payload.modelUsed} cached=false ms=${ms}` +
        (usage
          ? ` tokens=${usage.totalTokens ?? '?'} (p=${usage.promptTokens ?? '?'}, c=${usage.completionTokens ?? '?'})`
          : ''),
    )

    return payload
  } catch (e) {
    const ms = Date.now() - startedAt
    const errorMessage = e instanceof Error ? e.message : 'AI call failed'
    console.warn(`[ai] unavailable cached=false ms=${ms} err=${errorMessage}`)

    return {
      modelUsed: 'unavailable',
      cached: false,
      response: makeFallbackAiResponse({
        report: input.report,
        github: { kind: input.github.kind, target: input.github.target },
        errorMessage,
      }),
    }
  }
}
