import OpenAI from 'openai'

const GITHUB_MODELS_BASE_URL = 'https://models.inference.ai.azure.com'

export type GitHubModelsChatResult = {
  modelUsed: string
  cached: boolean
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  response: unknown
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { status?: number; code?: string; message?: string }
  if (anyErr.status === 429) return true
  if (anyErr.code && anyErr.code.toLowerCase().includes('rate')) return true
  if (anyErr.message && anyErr.message.toLowerCase().includes('rate')) return true
  return false
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed)
  }

  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) {
    const slice = trimmed.slice(first, last + 1)
    return JSON.parse(slice)
  }

  throw new Error('Model response was not JSON')
}

export async function callGitHubModelsJson(args: {
  model: 'gpt-4o' | 'gpt-4o-mini'
  system: string
  userJson: unknown
}): Promise<{ modelUsed: string; usage?: GitHubModelsChatResult['usage']; response: unknown }> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN is required for GitHub Models (AI) calls')
  }

  const client = new OpenAI({
    apiKey: token,
    baseURL: GITHUB_MODELS_BASE_URL,
  })

  const resp = await client.chat.completions.create({
    model: args.model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: args.system },
      { role: 'user', content: JSON.stringify(args.userJson) },
    ],
  })

  const modelUsed = resp.model ?? args.model
  const usage = resp.usage
    ? {
        promptTokens: resp.usage.prompt_tokens,
        completionTokens: resp.usage.completion_tokens,
        totalTokens: resp.usage.total_tokens,
      }
    : undefined

  const content = resp.choices?.[0]?.message?.content ?? ''
  const parsed = extractJsonObject(content)

  return { modelUsed, usage, response: parsed }
}

export async function callWithFallback(args: {
  system: string
  userJson: unknown
}): Promise<{ modelUsed: string; usage?: GitHubModelsChatResult['usage']; response: unknown }> {
  try {
    return await callGitHubModelsJson({ model: 'gpt-4o', system: args.system, userJson: args.userJson })
  } catch (e) {
    if (!isRateLimitError(e)) throw e
    return await callGitHubModelsJson({ model: 'gpt-4o-mini', system: args.system, userJson: args.userJson })
  }
}
