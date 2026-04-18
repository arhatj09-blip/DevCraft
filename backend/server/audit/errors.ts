import { GitHubApiError } from '../github/client.js'
import type { AuditErrorCode } from './types.js'

export type AuditFailure = {
  code: AuditErrorCode
  status: number
  message: string
}

function isAbortError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  )
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return 'Audit failed'
}

export function classifyAuditFailure(error: unknown): AuditFailure {
  if (error instanceof GitHubApiError) {
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      return {
        code: 'RATE_LIMITED',
        status: 429,
        message: 'GitHub API rate limit exceeded. Add GITHUB_TOKEN to increase limits and retry.',
      }
    }

    if (error.status === 404) {
      return {
        code: 'GITHUB_NOT_FOUND',
        status: 404,
        message: error.message || 'GitHub resource not found',
      }
    }

    if (error.status === 401 || error.status === 403) {
      return {
        code: 'GITHUB_ACCESS_DENIED',
        status: 502,
        message:
          'GitHub API access denied. Verify token scope/validity and repository visibility.',
      }
    }

    if (error.status >= 500) {
      return {
        code: 'UPSTREAM_UNAVAILABLE',
        status: 502,
        message: 'GitHub API is temporarily unavailable. Please retry shortly.',
      }
    }

    return {
      code: 'AUDIT_FAILED',
      status: 500,
      message: normalizeErrorMessage(error),
    }
  }

  if (isAbortError(error)) {
    return {
      code: 'UPSTREAM_TIMEOUT',
      status: 504,
      message: 'Upstream request timed out while collecting analysis data.',
    }
  }

  const message = normalizeErrorMessage(error)

  if (/timed out|timeout/i.test(message)) {
    return {
      code: 'UPSTREAM_TIMEOUT',
      status: 504,
      message: 'Upstream request timed out while collecting analysis data.',
    }
  }

  if (/fetch failed|enotfound|econnreset|econnrefused|network/i.test(message)) {
    return {
      code: 'UPSTREAM_UNAVAILABLE',
      status: 502,
      message: 'External service is temporarily unavailable. Please retry shortly.',
    }
  }

  return {
    code: 'AUDIT_FAILED',
    status: 500,
    message,
  }
}

export function resolveAuditFailure(input: {
  message?: string
  errorCode?: AuditErrorCode
}): AuditFailure {
  const message = input.message?.trim() || 'Audit failed'

  if (input.errorCode === 'RATE_LIMITED') {
    return { code: 'RATE_LIMITED', status: 429, message }
  }

  if (input.errorCode === 'GITHUB_NOT_FOUND') {
    return { code: 'GITHUB_NOT_FOUND', status: 404, message }
  }

  if (input.errorCode === 'GITHUB_ACCESS_DENIED') {
    return { code: 'GITHUB_ACCESS_DENIED', status: 502, message }
  }

  if (input.errorCode === 'UPSTREAM_TIMEOUT') {
    return { code: 'UPSTREAM_TIMEOUT', status: 504, message }
  }

  if (input.errorCode === 'UPSTREAM_UNAVAILABLE') {
    return { code: 'UPSTREAM_UNAVAILABLE', status: 502, message }
  }

  if (input.errorCode === 'AUDIT_FAILED') {
    return { code: 'AUDIT_FAILED', status: 500, message }
  }

  // Backward-compatible fallback for jobs created before structured error codes.
  if (/rate limit/i.test(message)) {
    return { code: 'RATE_LIMITED', status: 429, message }
  }

  return { code: 'AUDIT_FAILED', status: 500, message }
}
