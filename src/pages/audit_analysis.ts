import { apiGet } from './_shared/api'
import { requireJobIdOrRedirect, setLastJobId } from './_shared/auditSession'
import { setText } from './_shared/dom'

type StepStatus = 'pending' | 'active' | 'done' | 'error'

type AuditStatusResponse = {
  jobId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: number
  steps: Array<{ key: string; label: string; status: StepStatus }>
  message?: string
}

function iconForStepStatus(status: StepStatus): { containerClass: string; iconHtml: string; rowOpacity?: string } {
  if (status === 'done') {
    return {
      containerClass: 'w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20',
      iconHtml: '<span class="material-symbols-outlined text-on-primary text-sm font-bold">check</span>',
      rowOpacity: '',
    }
  }

  if (status === 'active') {
    return {
      containerClass:
        'w-8 h-8 rounded-full border-2 border-primary bg-surface-container-lowest flex items-center justify-center shrink-0 relative',
      iconHtml:
        '<div class="w-2.5 h-2.5 rounded-full bg-primary animate-ping absolute"></div>' +
        '<div class="w-2.5 h-2.5 rounded-full bg-primary relative z-20"></div>',
      rowOpacity: '',
    }
  }

  if (status === 'error') {
    return {
      containerClass: 'w-8 h-8 rounded-full bg-error flex items-center justify-center shrink-0',
      iconHtml: '<span class="material-symbols-outlined text-on-error text-sm font-bold">close</span>',
      rowOpacity: '',
    }
  }

  return {
    containerClass: 'w-8 h-8 rounded-full border-2 border-outline-variant bg-surface-container-lowest flex items-center justify-center shrink-0',
    iconHtml: '',
    rowOpacity: 'opacity-50',
  }
}

function renderSteps(steps: AuditStatusResponse['steps']): string {
  return steps
    .map((s) => {
      const icon = iconForStepStatus(s.status)
      const labelClass =
        s.status === 'active'
          ? 'font-body text-sm font-semibold text-primary'
          : s.status === 'done'
            ? 'font-body text-sm font-semibold text-on-surface'
            : 'font-body text-sm font-medium text-on-surface-variant'

      return `
        <div class="flex items-center gap-4 ${icon.rowOpacity ?? ''}">
          <div class="${icon.containerClass}">${icon.iconHtml}</div>
          <div class="flex-1">
            <h3 class="${labelClass}">${s.label}</h3>
          </div>
        </div>
      `
    })
    .join('')
}

async function run() {
  const jobId = requireJobIdOrRedirect('landing_page.html')
  setLastJobId(jobId)

  const headline = document.getElementById('auditHeadline')
  const subtext = document.getElementById('auditSubtext')
  const stepsHost = document.getElementById('auditSteps')

  const next = new URL('results_dashboard.html', window.location.href)
  next.searchParams.set('jobId', jobId)

  const deadlineMs = Date.now() + 5 * 60_000

  while (Date.now() < deadlineMs) {
    const s = await apiGet<AuditStatusResponse>(`/api/audit/${encodeURIComponent(jobId)}/status`)

    setText(headline, s.message ?? (s.status === 'failed' ? 'Audit failed' : 'Analyzing real-world code signals…'))
    setText(subtext, s.status === 'completed' ? 'Analysis complete. Redirecting…' : 'DevSkill Audit is processing architectural patterns and code quality metrics.')

    if (stepsHost) stepsHost.innerHTML = renderSteps(s.steps)

    if (s.status === 'completed') {
      window.location.href = next.toString()
      return
    }

    if (s.status === 'failed') {
      setText(subtext, s.message ?? 'Audit failed')
      return
    }

    await new Promise((r) => setTimeout(r, 850))
  }

  setText(subtext, 'Timed out waiting for audit completion.')
}

run().catch((e) => {
  const subtext = document.getElementById('auditSubtext')
  setText(subtext, e instanceof Error ? e.message : 'Failed to load audit status')
})
