import { Router } from 'express'
import { z } from 'zod'
import { createAuditJob, getAuditJob, startAuditSimulation } from './store.js'

const startAuditSchema = z.object({
  githubUrl: z
    .string()
    .min(1, 'GitHub URL is required')
    .refine((value) => {
      try {
        const url = new URL(value)
        return url.protocol === 'https:' || url.protocol === 'http:'
      } catch {
        return false
      }
    }, 'GitHub URL must be a valid URL')
    .refine((value) => {
      try {
        const url = new URL(value)
        return url.hostname.toLowerCase() === 'github.com'
      } catch {
        return false
      }
    }, 'GitHub URL must be a github.com URL'),
  liveAppUrl: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true
      try {
        const url = new URL(value)
        return url.protocol === 'https:' || url.protocol === 'http:'
      } catch {
        return false
      }
    }, 'Live app URL must be a valid http(s) URL'),
})

export const auditRouter = Router()

auditRouter.post('/start', (req, res) => {
  const parsed = startAuditSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      },
    })
  }

  const job = createAuditJob({
    githubUrl: parsed.data.githubUrl,
    liveAppUrl: parsed.data.liveAppUrl,
  })

  startAuditSimulation(job.id)

  return res.status(201).json({
    jobId: job.id,
    status: job.status,
  })
})

auditRouter.get('/:jobId/status', (req, res) => {
  const jobId = req.params.jobId
  const job = getAuditJob(jobId)
  if (!job) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Unknown jobId',
      },
    })
  }

  return res.json({
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    progress: job.progress,
    steps: job.steps,
    message: job.message,
  })
})
