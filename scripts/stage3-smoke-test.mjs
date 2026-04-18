import 'dotenv/config'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:8787'
const GITHUB_URL = process.env.TEST_GITHUB_URL ?? 'https://github.com/bradtraversy/50projects50days'

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
  console.log('[stage3] starting job…')
  const start = await postJson(`${BASE}/api/audit/start`, { githubUrl: GITHUB_URL })
  assert(start.status === 201, `Expected 201 from /start, got ${start.status}: ${JSON.stringify(start.json)}`)
  const jobId = start.json?.jobId
  assert(typeof jobId === 'string' && jobId.length > 0, 'Missing jobId')
  console.log('[stage3] jobId:', jobId)

  const deadlineMs = Date.now() + 180_000
  let status = null

  while (Date.now() < deadlineMs) {
    const s = await getJson(`${BASE}/api/audit/${jobId}/status`)
    if (s.ok && s.json?.status) {
      status = s.json.status
      if (status === 'completed') break
      if (status === 'failed') throw new Error(`Job failed: ${s.json?.message ?? 'unknown'}`)
    }
    // poll delay
    await new Promise((r) => setTimeout(r, 800))
  }

  assert(status === 'completed', `Timed out waiting for completion (last status=${status})`)

  const result = await getJson(`${BASE}/api/audit/${jobId}/result`)
  assert(result.ok, `Expected 200 result, got ${result.status}: ${JSON.stringify(result.json)}`)

  const report = result.json
  assert(report && typeof report === 'object', 'Report missing')
  assert(Array.isArray(report.projects), 'report.projects missing/invalid')

  // Stage 3 project-level breakdown fields
  const firstProject = report.projects[0]
  assert(firstProject, 'No projects returned')
  assert(Array.isArray(firstProject.strengths), 'projects[].strengths missing')
  assert(Array.isArray(firstProject.weaknesses), 'projects[].weaknesses missing')
  assert(Array.isArray(firstProject.issues), 'projects[].issues missing')

  // AI JSON presence + shape
  assert(report.ai && typeof report.ai === 'object', 'report.ai missing')
  assert(typeof report.ai.modelUsed === 'string', 'report.ai.modelUsed missing')
  assert(report.ai.response && typeof report.ai.response === 'object', 'report.ai.response missing')
  assert(hasKeys(report.ai.response, REQUIRED_AI_KEYS), `AI response missing required keys. Have: ${Object.keys(report.ai.response).join(', ')}`)

  // Step 5 stricter structure
  const hf = report.ai.response.honestFeedback
  assert(Array.isArray(hf) && hf.length > 0, 'ai.response.honestFeedback missing/empty')
  const hf0 = hf[0]
  assert(Array.isArray(hf0.flaws) && hf0.flaws.length >= 3, 'honestFeedback[0].flaws must be 3+ items')
  assert(Array.isArray(hf0.evidenceExamples) && hf0.evidenceExamples.length >= 1, 'honestFeedback[0].evidenceExamples missing')

  console.log(
    JSON.stringify(
      {
        ok: true,
        base: BASE,
        githubUrl: GITHUB_URL,
        summary: report.summary,
        projectsCount: report.projects.length,
        firstProject: {
          name: firstProject.name,
          score: firstProject.score,
          strengthsCount: firstProject.strengths.length,
          weaknessesCount: firstProject.weaknesses.length,
          issuesCount: firstProject.issues.length,
          firstIssueExample: firstProject.issues[0]?.example ?? null,
        },
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
  console.error('[stage3] FAIL:', e?.message ?? e)
  process.exit(1)
})
