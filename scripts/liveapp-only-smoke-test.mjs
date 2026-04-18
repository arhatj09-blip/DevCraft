import 'dotenv/config'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:8787'
const LIVE_APP_URL = process.env.TEST_LIVE_APP_URL ?? 'https://example.com'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await resp.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: resp.status, ok: resp.ok, json }
}

async function getJson(url) {
  const resp = await fetch(url)
  const text = await resp.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: resp.status, ok: resp.ok, json }
}

function hasKeys(obj, keys) {
  return !!obj && typeof obj === 'object' && keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k))
}

const REQUIRED_AI_KEYS = [
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
]

async function main() {
  console.log('[liveapp] starting job…')
  // Use the new single-field contract.
  const start = await postJson(`${BASE}/api/audit/start`, { inputUrl: LIVE_APP_URL })
  assert(start.status === 201, `Expected 201 from /start, got ${start.status}: ${JSON.stringify(start.json)}`)
  const jobId = start.json?.jobId
  assert(typeof jobId === 'string' && jobId.length > 0, 'Missing jobId')
  console.log('[liveapp] jobId:', jobId)

  const deadlineMs = Date.now() + 120_000
  let status = null

  while (Date.now() < deadlineMs) {
    const s = await getJson(`${BASE}/api/audit/${jobId}/status`)
    if (s.ok && s.json?.status) {
      status = s.json.status
      if (status === 'completed') break
      if (status === 'failed') throw new Error(`Job failed: ${s.json?.message ?? 'unknown'}`)
    }
    await new Promise((r) => setTimeout(r, 800))
  }

  assert(status === 'completed', `Timed out waiting for completion (last status=${status})`)

  const result = await getJson(`${BASE}/api/audit/${jobId}/result`)
  assert(result.ok, `Expected 200 result, got ${result.status}: ${JSON.stringify(result.json)}`)

  const report = result.json
  assert(report && typeof report === 'object', 'Report missing')
  assert(Array.isArray(report.projects), 'report.projects missing/invalid')

  // Website-only audits are expected to have 0 repos.
  assert(report.projects.length === 0, `Expected 0 projects for live-app-only audit, got ${report.projects.length}`)

  assert(report.liveApp && typeof report.liveApp === 'object', 'report.liveApp missing')
  assert(report.liveApp.url === LIVE_APP_URL, `report.liveApp.url mismatch: ${report.liveApp.url}`)

  // AI JSON presence + required keys (may fall back if evidence is limited).
  assert(report.ai && typeof report.ai === 'object', 'report.ai missing')
  assert(typeof report.ai.modelUsed === 'string', 'report.ai.modelUsed missing')
  assert(report.ai.response && typeof report.ai.response === 'object', 'report.ai.response missing')
  assert(hasKeys(report.ai.response, REQUIRED_AI_KEYS), `AI response missing required keys. Have: ${Object.keys(report.ai.response).join(', ')}`)

  console.log(
    JSON.stringify(
      {
        ok: true,
        base: BASE,
        inputUrl: LIVE_APP_URL,
        projectsCount: report.projects.length,
        liveApp: report.liveApp,
        ai: {
          modelUsed: report.ai.modelUsed,
          cached: report.ai.cached,
          hasAllRequiredKeys: hasKeys(report.ai.response, REQUIRED_AI_KEYS),
        },
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error('[liveapp] FAIL:', e?.message ?? e)
  process.exit(1)
})
