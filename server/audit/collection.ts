import type { RepoSignal } from '../github/analyze.js'
import type { CommitSample } from '../github/commits.js'
import type { LiveAppAnalysis } from '../liveapp/analyze.js'

export type RepoCollection = RepoSignal & {
  commitSample?: CommitSample
}

export type DataCollection = {
  github: {
    inputUrl: string
    kind: 'profile' | 'repo'
    target: string

    totalRepos: number
    detailedRepos: number
    truncated: boolean

    languagesObserved: string[]
    repoIndex: Array<{
      fullName: string
      htmlUrl: string
      pushedAt?: string
      updatedAt?: string
    }>
    repos: RepoCollection[]
  }
  liveApp?: {
    url: string
    loadTimeMs?: number
    performanceScore?: number

    accessibilityScore?: number
    uiUxScore?: number
    interactionSmoothnessScore?: number

    notes: string[]
  }
  limitations: string[]
  generatedAt: number
}

export function buildDataCollection(input: {
  githubUrl: string
  githubKind: 'profile' | 'repo'
  githubTarget: string
  repos: RepoCollection[]
  repoIndex: Array<{ fullName: string; htmlUrl: string; pushedAt?: string; updatedAt?: string }>
  totalRepos: number
  detailedRepos: number
  truncated: boolean
  liveApp?: LiveAppAnalysis
  limitations: string[]
}): DataCollection {
  const languages = new Set(input.repos.flatMap((r) => r.primaryLanguages))

  return {
    github: {
      inputUrl: input.githubUrl,
      kind: input.githubKind,
      target: input.githubTarget,
      totalRepos: input.totalRepos,
      detailedRepos: input.detailedRepos,
      truncated: input.truncated,
      languagesObserved: Array.from(languages),
      repoIndex: input.repoIndex,
      repos: input.repos,
    },
    liveApp: input.liveApp
      ? {
          url: input.liveApp.url,
          loadTimeMs: input.liveApp.loadTimeMs,
          performanceScore: input.liveApp.performanceScore,
          accessibilityScore: input.liveApp.accessibilityScore,
          uiUxScore: undefined,
          interactionSmoothnessScore: undefined,
          notes: input.liveApp.notes,
        }
      : undefined,
    limitations: input.limitations,
    generatedAt: Date.now(),
  }
}
