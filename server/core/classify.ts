import type { RepoSignal } from '../github/analyze.js'
import type { RepoClassification, RepoType } from './types.js'

const DOC_DATA_EXT = new Set([
  '.md',
  '.mdx',
  '.json',
  '.yml',
  '.yaml',
  '.csv',
  '.tsv',
  '.toml',
  '.ini',
  '.txt',
])

const LOGIC_EXT = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.kt',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.cs',
  '.c',
  '.cc',
  '.cpp',
])

function extOf(path: string): string {
  const i = path.lastIndexOf('.')
  return i === -1 ? '' : path.slice(i).toLowerCase()
}

export function classifyRepoType(input: {
  repo: RepoSignal
  blobPaths: string[]
  topLevelFolders: string[]
  readmeText?: string
}): RepoClassification {
  const { blobPaths, topLevelFolders } = input

  const totalFiles = blobPaths.length
  const docsAndDataFiles = blobPaths.filter((p) => DOC_DATA_EXT.has(extOf(p))).length
  const logicFiles = blobPaths.filter((p) => LOGIC_EXT.has(extOf(p))).length

  const docsAndDataRatio = totalFiles > 0 ? docsAndDataFiles / totalFiles : 0
  const logicRatio = totalFiles > 0 ? logicFiles / totalFiles : 0

  const hasSrcLikeFolders = topLevelFolders.some((f) => ['src', 'lib', 'app'].includes(f.toLowerCase()))
  const hasAppLikeFolders = topLevelFolders.some((f) =>
    ['server', 'backend', 'api', 'apps', 'packages'].includes(f.toLowerCase()),
  )

  const repoName = input.repo.fullName.split('/')[1] ?? input.repo.fullName
  const repoNameLower = repoName.toLowerCase()
  const readmeLower = (input.readmeText ?? '').toLowerCase()

  const curatedReadmeSignals =
    (readmeLower.includes('awesome') && (readmeLower.includes('list') || readmeLower.includes('curated'))) ||
    readmeLower.includes('curated list') ||
    (readmeLower.includes('resources') && (readmeLower.includes('links') || readmeLower.includes('collection')))

  const signals: string[] = []
  signals.push(`docs+data ratio ≈ ${(docsAndDataRatio * 100).toFixed(0)}%`)
  signals.push(`logic code ratio ≈ ${(logicRatio * 100).toFixed(0)}%`)
  if (!hasSrcLikeFolders) signals.push('no src/lib/app top-level folder detected')
  if (!hasAppLikeFolders) signals.push('no server/backend/api/apps/packages top-level folder detected')
  if (repoNameLower.includes('awesome') || curatedReadmeSignals) {
    signals.push('curated-resource keywords detected (awesome/curated/resources)')
  }

  // Heuristics:
  // - Resource repo: overwhelmingly docs/data, low logic, large README / curated list.
  // - Data repo: overwhelmingly data files (json/csv) and minimal code.
  // - Tutorial repo: many lesson-like folders and some logic code.
  // - Otherwise: software project.

  const lessonFolderCount = topLevelFolders.filter((f) => /^\d{2,}\./.test(f) || /lesson|tutorial|examples?/i.test(f)).length
  const hasManyLessons = lessonFolderCount >= 3

  let repoType: RepoType = 'software_project'
  let confidence = 0.55

  const dataHeavy = docsAndDataRatio >= 0.9 && logicRatio <= 0.05
  const jsonHeavy = totalFiles > 0 && blobPaths.filter((p) => extOf(p) === '.json').length / totalFiles >= 0.6

  // Strong curated list signal (awesome list / curated resources)
  if (repoNameLower.startsWith('awesome-') || (readmeLower.includes('awesome') && readmeLower.includes('list'))) {
    repoType = 'resource_repo'
    confidence = 0.9
    signals.push('strong awesome-list signal from repo name/README')
  } else if (curatedReadmeSignals && docsAndDataRatio >= 0.55 && logicRatio <= 0.2) {
    repoType = 'resource_repo'
    confidence = 0.85
    signals.push('curated resource/documentation signals + high docs/data ratio')
  }

  // Dataset/data repos
  if (
    repoType === 'software_project' &&
    (readmeLower.includes('dataset') || readmeLower.includes('data set') || readmeLower.includes('csv') || readmeLower.includes('jsonl')) &&
    (docsAndDataRatio >= 0.55 || dataHeavy)
  ) {
    repoType = 'data_repo'
    confidence = 0.8
    signals.push('dataset/data keywords detected in README + data-heavy file mix')
  }

  // Tutorial/course repos
  if (
    repoType === 'software_project' &&
    (readmeLower.includes('tutorial') || readmeLower.includes('course') || readmeLower.includes('learn') || readmeLower.includes('exercises')) &&
    docsAndDataRatio >= 0.4
  ) {
    repoType = 'tutorial_repo'
    confidence = 0.75
    signals.push('tutorial/course keywords detected in README')
  }

  if (repoType === 'software_project' && dataHeavy && jsonHeavy) {
    repoType = 'data_repo'
    confidence = 0.82
    signals.push('majority of files are JSON/data-like with minimal executable logic')
  } else if (repoType === 'software_project' && dataHeavy) {
    repoType = 'resource_repo'
    confidence = 0.8
    signals.push('repo appears documentation/curated-list oriented with minimal executable logic')
  } else if (repoType === 'software_project' && hasManyLessons && logicRatio >= 0.15) {
    repoType = 'tutorial_repo'
    confidence = 0.7
    signals.push(`lesson/tutorial folder pattern detected (${lessonFolderCount})`)
  } else {
    if (repoType === 'software_project') {
      repoType = 'software_project'
      confidence = 0.6
    }
  }

  // Override: if src/app/backend exists *and* there's meaningful logic, bias toward software.
  // (Curated list repos sometimes include a small docs site; don't always override.)
  if ((hasSrcLikeFolders || hasAppLikeFolders) && repoType !== 'tutorial_repo' && logicRatio >= 0.25) {
    repoType = 'software_project'
    confidence = Math.max(confidence, 0.72)
    signals.push('src/app/backend-like folder + meaningful logic ratio → treat as software project')
  }

  return {
    repoType,
    confidence,
    signals,
    metrics: {
      totalFiles,
      docsAndDataFiles,
      logicFiles,
      docsAndDataRatio,
      logicRatio,
      hasSrcLikeFolders,
      hasAppLikeFolders,
    },
  }
}
