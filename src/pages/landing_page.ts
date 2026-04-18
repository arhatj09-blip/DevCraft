import { apiPost } from './_shared/api'
import { setLastJobId } from './_shared/auditSession'
import { setText } from './_shared/dom'

type StartAuditResponse = { jobId: string; status: string }

function normalizeUrl(value: string): string | undefined {
  const v = value.trim()
  return v ? v : undefined
}

async function run() {
  const githubInput = document.getElementById('github-url') as HTMLInputElement | null
  const liveInput = document.getElementById('live-url') as HTMLInputElement | null
  const runBtn = document.getElementById('runAuditBtn') as HTMLButtonElement | null
  const err = document.getElementById('formError')

  const setError = (msg: string | null) => {
    if (!err) return
    if (!msg) {
      err.classList.add('hidden')
      err.textContent = ''
      return
    }
    err.classList.remove('hidden')
    err.textContent = msg
  }

  if (!githubInput || !liveInput || !runBtn) return

  runBtn.addEventListener('click', async () => {
    setError(null)

    const githubUrl = normalizeUrl(githubInput.value)
    const liveAppUrl = normalizeUrl(liveInput.value)

    if (!githubUrl && !liveAppUrl) {
      setError('Please enter a GitHub URL or a Live App URL.')
      return
    }

    runBtn.disabled = true
    const original = runBtn.textContent
    setText(runBtn, 'Starting audit…')

    try {
      // If a GitHub URL is provided, keep the existing two-field contract.
      // If only a live URL is provided, use inputUrl so backend can treat it as web-only.
      const body = githubUrl
        ? { githubUrl, liveAppUrl }
        : { inputUrl: liveAppUrl }

      const resp = await apiPost<StartAuditResponse>('/api/audit/start', body)
      setLastJobId(resp.jobId)

      const next = new URL('audit_analysis.html', window.location.href)
      next.searchParams.set('jobId', resp.jobId)
      window.location.href = next.toString()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start audit')
      runBtn.disabled = false
      setText(runBtn, original ?? 'Run Audit')
    }
  })

  // Optional convenience: allow Enter key in either input.
  ;[githubInput, liveInput].forEach((input) => {
    input.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return
      ev.preventDefault()
      runBtn.click()
    })
  })
}

run().catch(() => {
  // no-op
})
