import fs from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:8787'
const INPUT_URL = process.argv[2] ?? 'https://github.com/supabase/supabase'

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function fetchJson(url, init) {
  const res = await fetch(url, init)
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { _raw: text }
  }
  return { status: res.status, ok: res.ok, json }
}

async function main() {
  console.log('[0] health')
  const health = await fetchJson(`${BASE}/api/health`)
  console.log(JSON.stringify(health, null, 2))
  if (!health.ok || !health.json?.ok) throw new Error('Health check failed')

  console.log('\n[1] start audit')
  const start = await fetchJson(`${BASE}/api/audit/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inputUrl: INPUT_URL }),
  })
  console.log(JSON.stringify(start, null, 2))
  if (start.status !== 201) throw new Error(`Start failed: HTTP ${start.status}`)

  const jobId = start.json?.jobId
  if (typeof jobId !== 'string' || !jobId) throw new Error('Missing jobId')

  const outDir = path.join(process.cwd(), 'audit-outputs', jobId)
  await fs.mkdir(outDir, { recursive: true })

  console.log(`\njobId=${jobId}`)
  console.log(`outputDir=${outDir}`)

  console.log('\n[2] poll status (captures each step transition)')
  const deadline = Date.now() + 20 * 60_000
  let lastActive = ''
  let lastStatus = ''

  while (Date.now() < deadline) {
    const st = await fetchJson(`${BASE}/api/audit/${jobId}/status`)
    if (!st.ok) throw new Error(`Status failed: HTTP ${st.status}: ${JSON.stringify(st.json)}`)

    const steps = Array.isArray(st.json?.steps) ? st.json.steps : []
    const active = steps.find((s) => s && s.status === 'active')
    const activeLabel = active?.label ?? ''

    if (st.json?.status !== lastStatus || activeLabel !== lastActive) {
      lastStatus = st.json?.status
      lastActive = activeLabel
      console.log(JSON.stringify({
        at: new Date().toISOString(),
        jobId,
        status: st.json?.status,
        progress: st.json?.progress,
        activeStep: active ? { key: active.key, label: active.label, status: active.status } : null,
        message: st.json?.message,
        steps: steps.map((s) => ({ key: s.key, label: s.label, status: s.status })),
      }, null, 2))
    }

    if (st.json?.status === 'completed' || st.json?.status === 'failed') {
      await fs.writeFile(path.join(outDir, 'status.final.json'), JSON.stringify(st.json, null, 2), 'utf-8')
      if (st.json.status === 'failed') throw new Error(`Audit failed: ${st.json?.message ?? 'unknown'}`)
      break
    }

    await sleep(1200)
  }

  console.log('\n[3] fetch stage outputs')
  const collection = await fetchJson(`${BASE}/api/audit/${jobId}/collection`)
  const analysis = await fetchJson(`${BASE}/api/audit/${jobId}/analysis`)
  const result = await fetchJson(`${BASE}/api/audit/${jobId}/result`)

  await fs.writeFile(path.join(outDir, 'collection.json'), JSON.stringify(collection.json, null, 2), 'utf-8')
  await fs.writeFile(path.join(outDir, 'analysis.json'), JSON.stringify(analysis.json, null, 2), 'utf-8')
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify(result.json, null, 2), 'utf-8')

  console.log(JSON.stringify({
    jobId,
    collectionStatus: collection.status,
    analysisStatus: analysis.status,
    resultStatus: result.status,
    files: ['status.final.json', 'collection.json', 'analysis.json', 'result.json'],
  }, null, 2))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack : e)
  process.exitCode = 1
})
