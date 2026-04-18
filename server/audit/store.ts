import type { AuditJob, AuditStartInput, AuditStep } from './types.js'
import { nanoid } from 'nanoid'

const jobs = new Map<string, AuditJob>()

const defaultSteps: AuditStep[] = [
  { key: 'fetch_repos', label: 'Fetching repositories', status: 'pending' },
  { key: 'analyze_structure', label: 'Analyzing code structure', status: 'pending' },
  { key: 'detect_patterns', label: 'Detecting patterns & issues', status: 'pending' },
  { key: 'ui_performance_audit', label: 'Running UI & performance audit', status: 'pending' },
  { key: 'generate_insights', label: 'Generating insights', status: 'pending' },
]

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function computeProgressFromSteps(steps: AuditStep[]) {
  const doneCount = steps.filter((s) => s.status === 'done').length
  const activeCount = steps.filter((s) => s.status === 'active').length
  const portion = 100 / steps.length
  return clampProgress(doneCount * portion + activeCount * portion * 0.5)
}

function setActiveStep(job: AuditJob, index: number) {
  job.steps = job.steps.map((step, i) => {
    if (i < index) return { ...step, status: 'done' }
    if (i === index) return { ...step, status: 'active' }
    return { ...step, status: 'pending' }
  })
  job.progress = computeProgressFromSteps(job.steps)
}

function finalizeJob(job: AuditJob) {
  job.steps = job.steps.map((s) => ({ ...s, status: 'done' }))
  job.progress = 100
  job.status = 'completed'
  job.finishedAt = Date.now()
  job.message = undefined
}

export function startAuditSimulation(jobId: string) {
  const job = jobs.get(jobId)
  if (!job) return
  if (job.status !== 'queued') return

  job.status = 'running'
  job.startedAt = Date.now()
  job.message = 'Analyzing real-world code signals…'
  setActiveStep(job, 0)

  const baseDurationsMs = [1400, 1600, 1500, 1800, 1400]
  const jitterMs = () => Math.floor(Math.random() * 400)

  let total = 0
  baseDurationsMs.forEach((duration, index) => {
    total += duration + jitterMs()
    setTimeout(() => {
      const current = jobs.get(jobId)
      if (!current || current.status !== 'running') return

      if (index < current.steps.length - 1) {
        setActiveStep(current, index + 1)
      } else {
        finalizeJob(current)
      }
    }, total)
  })
}

export function createAuditJob(input: AuditStartInput): AuditJob {
  const now = Date.now()
  const job: AuditJob = {
    id: nanoid(12),
    createdAt: now,
    status: 'queued',
    input,

    progress: 0,
    steps: defaultSteps.map((s) => ({ ...s })),
  }

  jobs.set(job.id, job)
  return job
}

export function getAuditJob(jobId: string): AuditJob | undefined {
  return jobs.get(jobId)
}
