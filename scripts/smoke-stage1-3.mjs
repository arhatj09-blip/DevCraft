const base = process.env.AUDIT_BASE_URL ?? 'http://localhost:8787'

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message)
    error.name = 'AssertionError'
    throw error
  }
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function main() {
  // Health
  const health = await (await fetch(`${base}/api/health`)).json()
  console.log('health', health)
  assert(health?.ok === true, 'health check failed')

  // Validation (bad request)
  const badRes = await fetch(`${base}/api/audit/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ githubUrl: 'not-a-url' }),
  })
  console.log('bad status', badRes.status)
  assert(badRes.status === 400, 'expected 400 for invalid githubUrl')
  const badBody = await badRes.json().catch(() => null)
  assert(Boolean(badBody?.error), 'expected error payload for bad request')

  // Stage 1: start
  const startRes = await fetch(`${base}/api/audit/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ githubUrl: 'https://github.com/octocat/Hello-World' }),
  })
  console.log('start status', startRes.status)
  assert(startRes.status === 201, 'expected 201 from /start')

  const start = await startRes.json()
  console.log('start payload', start)
  assert(typeof start?.jobId === 'string' && start.jobId.length > 0, 'missing jobId')

  const jobId = start.jobId

  // Stage 1: collection (should be ready by the time job completes; allow early availability too)
  // We don't hard-fail on GitHub rate-limits, but we do validate shape when present.
  for (let i = 0; i < 40; i++) {
    const colRes = await fetch(`${base}/api/audit/${jobId}/collection`)
    if (colRes.status === 200) {
      const col = await colRes.json()
      const repo0 = col?.github?.repos?.[0]
      if (repo0?.commitSample?.commits) {
        assert(Array.isArray(repo0.commitSample.commits), 'commitSample.commits should be an array')
        assert(repo0.commitSample.commits.length <= 60, 'commitSample.commits should be capped at 60')
        const c0 = repo0.commitSample.commits[0]
        assert(typeof c0?.title === 'string', 'commitSample commit title missing')
        assert(typeof c0?.date === 'string', 'commitSample commit date missing')
      }
      break
    }
    await sleep(250)
  }

  // Stage 2: poll status
  let finalStatus = ''
  for (let i = 0; i < 40; i++) {
    const st = await (await fetch(`${base}/api/audit/${jobId}/status`)).json()
    const active = st?.steps?.find?.((x) => x.status === 'active')
    console.log(
      'status',
      i,
      st.status,
      `${st.progress}%`,
      active ? active.label : '',
      st.message ?? '',
    )
    finalStatus = st.status
    if (st.status === 'completed' || st.status === 'failed') break
    await sleep(500)
  }
  assert(finalStatus === 'completed', `expected completed, got ${finalStatus}`)

  // Stage 2: analysis
  const analysisRes = await fetch(`${base}/api/audit/${jobId}/analysis`)
  console.log('analysis status', analysisRes.status)
  assert(analysisRes.status === 200, 'expected 200 from /analysis after completion')
  const analysis = await analysisRes.json()
  const analysisRequired = ['engine', 'repos', 'generatedAt', 'limitations']
  const analysisMissing = analysisRequired.filter((k) => !(k in analysis))
  console.log('analysis missing keys', analysisMissing)
  assert(analysisMissing.length === 0, `missing analysis keys: ${analysisMissing.join(', ')}`)
  assert(analysis.engine?.name === 'CORE', 'analysis engine should be CORE')
  assert(Array.isArray(analysis.repos), 'analysis.repos should be array')
  const a0 = analysis.repos?.[0]
  assert(Boolean(a0?.classification?.repoType), 'analysis.repos[0].classification.repoType missing')
  assert(Boolean(a0?.analysisMode), 'analysis.repos[0].analysisMode missing')

  // Stage 3: result
  const resultRes = await fetch(`${base}/api/audit/${jobId}/result`)
  console.log('result status', resultRes.status)
  assert(resultRes.status === 200, 'expected 200 from /result after completion')

  const result = await resultRes.json()
  const required = [
    'summary',
    'strengths',
    'weaknesses',
    'projects',
    'codeLevelFindings',
    'careerInsights',
    'skillGaps',
    'roadmap',
    'resumeInsights',
    'meta',
  ]

  const missing = required.filter((k) => !(k in result))
  console.log('missing sections', missing)
  assert(missing.length === 0, `missing sections: ${missing.join(', ')}`)

  const p0 = result?.projects?.[0]
  assert(typeof p0?.score === 'number', 'projects[0].score missing')
  assert(Array.isArray(p0?.strengths), 'projects[0].strengths should be array')
  assert(Array.isArray(p0?.weaknesses), 'projects[0].weaknesses should be array')
  assert(Array.isArray(p0?.issues), 'projects[0].issues should be array')

  console.log('summary', result.summary)
  console.log('counts', {
    strengths: result.strengths?.length,
    weaknesses: result.weaknesses?.length,
    projects: result.projects?.length,
  })

  console.log('OK: Stage 1–3 smoke test passed')
}

main().catch((e) => {
  console.error('Smoke test failed:', e)
  process.exit(1)
})
