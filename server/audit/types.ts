export type AuditJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export type AuditStepStatus = 'pending' | 'active' | 'done' | 'error'

export type AuditStepKey =
  | 'fetch_repos'
  | 'analyze_structure'
  | 'detect_patterns'
  | 'ui_performance_audit'
  | 'generate_insights'

export type AuditStep = {
  key: AuditStepKey
  label: string
  status: AuditStepStatus
}

export type AuditStartInput = {
  githubUrl: string
  liveAppUrl?: string
}

export type AuditJob = {
  id: string
  createdAt: number
  startedAt?: number
  finishedAt?: number
  status: AuditJobStatus
  input: AuditStartInput

  progress: number
  steps: AuditStep[]
  message?: string
}
