import 'dotenv/config'
import OpenAI from 'openai'

const baseURL = 'https://models.inference.ai.azure.com'
const apiKey = process.env.GITHUB_TOKEN
if (!apiKey) {
  console.error('Missing GITHUB_TOKEN in environment (.env)')
  process.exit(1)
}

const client = new OpenAI({ apiKey, baseURL })

async function callModel(model) {
  const resp = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Return ONLY valid JSON.' },
      {
        role: 'user',
        content: JSON.stringify({
          test: 'ping',
          instructions: 'Return {"ok": true, "model": "<model>"}.',
        }),
      },
    ],
  })

  const content = resp.choices?.[0]?.message?.content ?? ''
  console.log('content:', content)
  console.log(
    JSON.stringify(
      {
        apiBaseURL: baseURL,
        modelRequested: model,
        modelUsed: resp.model ?? null,
        usage: resp.usage ?? null,
      },
      null,
      2,
    ),
  )
}

try {
  await callModel('gpt-4o')
} catch (err) {
  const status = err?.status ?? err?.response?.status
  const message = err?.message ?? String(err)

  if (status === 429) {
    console.warn('Rate limited on gpt-4o; retrying gpt-4o-mini')
    await callModel('gpt-4o-mini')
  } else {
    console.error('ERROR', status ?? '?', message)
    process.exit(1)
  }
}
