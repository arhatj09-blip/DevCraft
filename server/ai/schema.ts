import { z } from 'zod'

export const aiLevelSchema = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v
    const s = v.trim().toLowerCase()
    if (s === 'beginner') return 'Beginner'
    if (s === 'intermediate') return 'Intermediate'
    if (s === 'advanced') return 'Advanced'
    return v
  },
  z.enum(['Beginner', 'Intermediate', 'Advanced']),
)

export const aiPerRepoSchema = z.object({
  repoFullName: z.string().min(1),
  score10: z.number().min(0).max(10),
  verdict: z.string().min(1),
  reasons: z.array(z.string().min(1)).default([]),
  evidenceExamples: z.array(z.string().min(1)).default([]),
})

export const aiHonestFeedbackItemSchema = z.object({
  // Direct, specific statement (no vagueness)
  statement: z.string().min(1),

  // Where this comes from (ideally a repo under analysis)
  repoFullName: z.string().min(1).optional(),

  // The concrete problems a reviewer would reject (must be 3+)
  flaws: z.array(z.string().min(1)).min(3),

  // What code-review bar this fails at (case-insensitive)
  reviewGate: z.preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.enum(['junior', 'mid-level', 'senior']),
  ),

  whyRejectedInCodeReview: z.string().min(1),

  // Actionable fixes
  fixes: z.array(z.string().min(1)).min(1),

  // Explicit positioning impact
  levelUpImpact: z.object({
    from: aiLevelSchema,
    to: aiLevelSchema,
    reasoning: z.preprocess(
      (v) => (typeof v === 'string' ? [v] : v),
      z.array(z.string().min(1)).min(1),
    ),
  }),

  // Traceability: must cite evidence from input (prefer filePath:line)
  evidenceExamples: z.array(z.string().min(1)).min(1),
})

export const aiRoleItemSchema = z.object({
  role: z.string().min(1),
  why: z.array(z.string().min(1)).min(1),
})

export const aiSkillGapItemSchema = z.object({
  gap: z.string().min(1),
  whyBlocksProgression: z.string().min(1),
  evidenceExamples: z.array(z.string().min(1)).min(1),
  recommendedFixes: z.array(z.string().min(1)).min(1).optional(),
})

export const aiRoadmapWeekItemSchema = z.object({
  weekRange: z.string().min(1),
  priority: z.preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.enum(['high', 'medium', 'low']),
  ),
  actions: z.array(z.string().min(1)).min(1),
  repoFullName: z.string().min(1).optional(),
  evidenceExamples: z.array(z.string().min(1)).min(1),
})

export const aiInsightsResponseSchema = z.object({
  overallScore10: z.number().min(0).max(10),
  strengths: z.array(z.string().min(1)),
  weaknesses: z.array(z.string().min(1)),

  // STEP 5
  honestFeedback: z.array(aiHonestFeedbackItemSchema).min(1),

  perRepo: z.array(aiPerRepoSchema),

  // STEP 4
  skillMap: z.object({
    coreStrengths: z.array(z.string().min(1)),
    criticalWeaknesses: z.array(z.string().min(1)),
  }),

  // STEP 6
  levelEstimate: z.object({
    level: aiLevelSchema,
    percentile: z.number().min(0).max(100),
    reasoning: z.array(z.string().min(1)).min(1),
  }),

  // STEP 7
  roleReadiness: z.object({
    ready: z.array(aiRoleItemSchema),
    notReady: z.array(aiRoleItemSchema),
  }),

  // STEP 8
  skillGapAnalysis: z.array(aiSkillGapItemSchema).min(1),
  // Kept for backwards compatibility (can be a condensed list of skillGapAnalysis.gap)
  skillGaps: z.array(z.string().min(1)),

  roadmap90Days: z.object({
    days1to30: z.array(z.string().min(1)),
    days31to60: z.array(z.string().min(1)),
    days61to90: z.array(z.string().min(1)),
  }),

  // STEP 9 (detailed week-by-week plan)
  roadmapWeeks: z.array(aiRoadmapWeekItemSchema).min(3),

  brutallyHonestSummary: z.string().min(1),
})

export type AiInsightsResponse = z.infer<typeof aiInsightsResponseSchema>
