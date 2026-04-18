import { Linter } from 'eslint'
import { parse } from '@babel/parser'
import crypto from 'node:crypto'
import globals from 'globals'

import type { RepoSignal } from '../github/analyze.js'
import { fetchRepoTextFile, fetchRepoTree } from './githubFetch.js'
import type { CodeFinding, RepoCodebaseAnalysis, Severity } from './types.js'
import { classifyRepoType } from './classify.js'

const MAX_FILES_PER_REPO = Number(process.env.CORE_MAX_FILES ?? 25)
const MAX_FILE_BYTES = Number(process.env.CORE_MAX_FILE_BYTES ?? 200_000)

const JS_EXT = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'])
const ANALYZABLE_EXT = new Set([
  ...JS_EXT,
  '.py',
  '.html',
  '.css',
  '.scss',
  '.json',
  '.yml',
  '.yaml',
  '.md',
])

function extOf(path: string): string {
  const i = path.lastIndexOf('.')
  return i === -1 ? '' : path.slice(i).toLowerCase()
}

function computeLineNumber(text: string, index: number): number {
  if (index <= 0) return 1
  let line = 1
  for (let i = 0; i < Math.min(index, text.length); i++) {
    if (text.charCodeAt(i) === 10) line += 1
  }
  return line
}

function severityRank(s: Severity): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : s === 'low' ? 1 : 0
}

function addFinding(findings: CodeFinding[], finding: CodeFinding) {
  findings.push(finding)
}

function scanRegexRules(filePath: string, text: string, findings: CodeFinding[]) {
  const rules: Array<{
    id: string
    category: CodeFinding['category']
    severity: Severity
    title: string
    pattern: RegExp
    evidence?: (m: RegExpMatchArray) => string
  }> = [
    {
      id: 'secret.aws_access_key',
      category: 'security',
      severity: 'high',
      title: 'Possible AWS access key',
      pattern: /AKIA[0-9A-Z]{16}/g,
    },
    {
      id: 'secret.private_key',
      category: 'security',
      severity: 'high',
      title: 'Private key material',
      pattern: /-----BEGIN (?:RSA|EC|OPENSSH) PRIVATE KEY-----/g,
    },
    {
      id: 'secret.github_token',
      category: 'security',
      severity: 'high',
      title: 'Possible GitHub token',
      pattern: /(ghp|github_pat)_[A-Za-z0-9_]{20,}/g,
    },
    {
      id: 'secret.password_assignment',
      category: 'security',
      severity: 'medium',
      title: 'Possible hardcoded password',
      pattern: /password\s*[:=]\s*['"][^'"\n]{4,}['"]/gi,
    },
    {
      id: 'unsafe.eval',
      category: 'security',
      severity: 'high',
      title: 'Use of eval()',
      pattern: /\beval\s*\(/g,
    },
    {
      id: 'unsafe.new_function',
      category: 'security',
      severity: 'high',
      title: 'Use of new Function()',
      pattern: /\bnew\s+Function\s*\(/g,
    },
    {
      id: 'unsafe.inner_html',
      category: 'security',
      severity: 'medium',
      title: 'innerHTML assignment',
      pattern: /\.innerHTML\s*=/g,
    },
    {
      id: 'unsafe.dangerously_set_inner_html',
      category: 'security',
      severity: 'medium',
      title: 'dangerouslySetInnerHTML usage',
      pattern: /dangerouslySetInnerHTML\s*=/g,
    },
    {
      id: 'unsafe.document_write',
      category: 'security',
      severity: 'medium',
      title: 'document.write usage',
      pattern: /\bdocument\.write\s*\(/g,
    },
  ]

  for (const rule of rules) {
    for (const m of text.matchAll(rule.pattern)) {
      const idx = m.index ?? 0
      addFinding(findings, {
        id: `${rule.id}:${filePath}:${idx}`,
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        message: `Matched pattern ${rule.id}.`,
        tool: 'regex',
        ruleId: rule.id,
        filePath,
        line: computeLineNumber(text, idx),
        evidence: (m[0] ?? '').slice(0, 120),
      })
    }
  }
}

function computeReadabilitySignals(text: string) {
  const lines = text.split(/\r?\n/)
  let longLines = 0
  let todoFixme = 0
  let trailingWhitespace = 0

  for (const line of lines) {
    if (line.length > 120) longLines += 1
    if (/\b(TODO|FIXME)\b/i.test(line)) todoFixme += 1
    if (/\s+$/.test(line)) trailingWhitespace += 1
  }

  return { lineCount: lines.length, longLines, todoFixme, trailingWhitespace }
}

function isCamelCase(name: string) {
  return /^[a-z][a-zA-Z0-9]*$/.test(name) && !name.includes('_') && !name.includes('-')
}

function isPascalCase(name: string) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name) && !name.includes('_') && !name.includes('-')
}

type UnknownNode = Record<string, unknown> & { type?: unknown }

function isNode(value: unknown): value is UnknownNode {
  return typeof value === 'object' && value !== null
}

function nodeType(node: UnknownNode): string | undefined {
  return typeof node.type === 'string' ? node.type : undefined
}

function collectJsIdentifiers(ast: unknown): string[] {
  const out: string[] = []
  const stack: unknown[] = [ast]

  while (stack.length) {
    const node = stack.pop()
    if (!isNode(node)) continue

    if (nodeType(node) === 'Identifier' && typeof (node as Record<string, unknown>).name === 'string') {
      out.push((node as Record<string, unknown>).name as string)
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) stack.push(item)
      } else if (value && typeof value === 'object') {
        stack.push(value)
      }
    }
  }

  return out
}

type FunctionMetric = { name?: string; lengthLines: number; complexity: number; locStart?: number }

function computeJsFunctionMetrics(ast: unknown): FunctionMetric[] {
  const metrics: FunctionMetric[] = []

  const functionNodes: UnknownNode[] = []
  const stack: unknown[] = [ast]
  while (stack.length) {
    const node = stack.pop()
    if (!isNode(node)) continue

    const t = nodeType(node)
    if (t === 'FunctionDeclaration' || t === 'FunctionExpression' || t === 'ArrowFunctionExpression') {
      functionNodes.push(node)
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) stack.push(item)
      } else if (value && typeof value === 'object') {
        stack.push(value)
      }
    }
  }

  for (const fn of functionNodes) {
    const loc = (fn as Record<string, unknown>).loc as
      | { start?: { line?: unknown }; end?: { line?: unknown } }
      | undefined
    const start = typeof loc?.start?.line === 'number' ? loc.start.line : undefined
    const end = typeof loc?.end?.line === 'number' ? loc.end.line : undefined
    const lengthLines = typeof start === 'number' && typeof end === 'number' ? end - start + 1 : 0

    let name: string | undefined
    const id = (fn as Record<string, unknown>).id as Record<string, unknown> | null | undefined
    if (id && typeof id.name === 'string') name = id.name

    // Approx cyclomatic complexity: count branch-like nodes inside the function body.
    let complexity = 1
    const body = (fn as Record<string, unknown>).body
    const inner: unknown[] = [body]
    while (inner.length) {
      const n = inner.pop()
      if (!isNode(n)) continue

      switch (nodeType(n)) {
        case 'IfStatement':
        case 'ForStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'CatchClause':
        case 'ConditionalExpression':
          complexity += 1
          break
        case 'LogicalExpression':
          if ((n as Record<string, unknown>).operator === '&&' || (n as Record<string, unknown>).operator === '||')
            complexity += 1
          break
        case 'SwitchCase':
          // each case beyond the first increases paths
          complexity += 1
          break
      }

      for (const value of Object.values(n)) {
        if (Array.isArray(value)) {
          for (const item of value) inner.push(item)
        } else if (value && typeof value === 'object') {
          inner.push(value)
        }
      }
    }

    metrics.push({ name, lengthLines, complexity, locStart: start })
  }

  return metrics
}

function normalizeForDuplication(text: string) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function duplicationSignals(files: Array<{ path: string; text: string }>) {
  const windowSize = 12
  const occurrences = new Map<string, Set<string>>()

  for (const file of files) {
    const normalized = normalizeForDuplication(file.text)
    const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    for (let i = 0; i + windowSize <= lines.length; i++) {
      const chunk = lines.slice(i, i + windowSize).join('\n')
      const hash = crypto.createHash('sha1').update(chunk).digest('hex')
      const set = occurrences.get(hash) ?? new Set<string>()
      set.add(file.path)
      occurrences.set(hash, set)
    }
  }

  let signals = 0
  for (const set of occurrences.values()) {
    if (set.size >= 3) signals += 1
  }

  return signals
}

function createLinter() {
  const linter = new Linter()
  const config: Linter.Config = {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.es2021,
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      eqeqeq: 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-debugger': 'warn',
    },
  }
  return { linter, config }
}

function pickFilesForAnalysis(paths: string[]) {
  const important = ['package.json', 'README.md', 'readme.md']
  const picked: string[] = []

  for (const p of important) {
    if (paths.includes(p)) picked.push(p)
  }

  const codeFiles = paths
    .filter((p) => {
      const e = extOf(p)
      return ANALYZABLE_EXT.has(e)
    })
    .filter((p) => !p.toLowerCase().includes('node_modules/'))

  // Prefer JS/TS first, then others
  const priority = (p: string) => (JS_EXT.has(extOf(p)) ? 0 : 1)
  codeFiles.sort((a, b) => priority(a) - priority(b) || a.localeCompare(b))

  for (const p of codeFiles) {
    if (picked.length >= MAX_FILES_PER_REPO) break
    if (!picked.includes(p)) picked.push(p)
  }

  return picked
}

export async function analyzeRepoWithCore(repo: RepoSignal): Promise<RepoCodebaseAnalysis> {
  const [owner, name] = repo.fullName.split('/')
  const defaultBranch = repo.defaultBranch

  const findings: CodeFinding[] = []
  const limitations: string[] = []

  const tree = await fetchRepoTree(owner, name, defaultBranch).catch(() => ({ tree: [], truncated: false }))
  const blobPaths = tree.tree.filter((t) => t.type === 'blob').map((t) => t.path)

  if (tree.truncated) {
    limitations.push('GitHub tree listing was truncated; analysis is based on partial file list.')
  }

  const picked = pickFilesForAnalysis(blobPaths)
  const sampledFiles: Array<{ path: string; text: string }> = []

  for (const p of picked) {
    const res = await fetchRepoTextFile({ owner, repo: name, path: p, ref: defaultBranch, maxBytes: MAX_FILE_BYTES }).catch(
      () => null,
    )
    if (!res) continue
    sampledFiles.push({ path: p, text: res.text })
  }

  limitations.push(`CORE samples up to ${MAX_FILES_PER_REPO} files per repo (current: ${sampledFiles.length}).`)
  limitations.push(`CORE skips files larger than ${MAX_FILE_BYTES} bytes.`)

  const readmeText = sampledFiles.find((f) => f.path.toLowerCase() === 'readme.md')?.text

  const classification = classifyRepoType({
    repo,
    blobPaths,
    topLevelFolders: repo.topLevelFolders,
    readmeText,
  })

  const analysisMode: 'full' | 'limited' =
    classification.repoType === 'resource_repo' || classification.repoType === 'data_repo' ? 'limited' : 'full'

  const criticalInsight =
    analysisMode === 'limited'
      ? `This repository does not represent a software project. It is primarily a curated list/documentation/data resource (type: ${classification.repoType}). Developer skill cannot be accurately evaluated from architecture/scalability/backend signals here.`
      : undefined

  let linesScanned = 0
  let longLines = 0
  let eslintIssues = 0
  let longFunctions = 0
  let highComplexityFunctions = 0

  const namingNotes: string[] = []
  const readabilityNotes: string[] = []
  const complexityNotes: string[] = []
  const duplicationNotes: string[] = []

  // Naming conventions: infer from file names
  const fileNameTokens = picked.map((p) => p.split('/').pop() ?? p)
  const kebab = fileNameTokens.filter((n) => n.includes('-')).length
  const snake = fileNameTokens.filter((n) => n.includes('_')).length
  const upper = fileNameTokens.filter((n) => /[A-Z]/.test(n)).length
  if (kebab + snake + upper > 0) {
    namingNotes.push(
      `File naming signals: kebab-case=${kebab}, snake_case=${snake}, uppercase-in-name=${upper} (heuristic).`,
    )
  }

  const eslint = createLinter()

  for (const file of sampledFiles) {
    scanRegexRules(file.path, file.text, findings)

    const r = computeReadabilitySignals(file.text)
    linesScanned += r.lineCount
    longLines += r.longLines
    if (r.todoFixme > 0) readabilityNotes.push(`${file.path}: TODO/FIXME mentions (${r.todoFixme}).`)
    if (r.trailingWhitespace > 0)
      readabilityNotes.push(`${file.path}: trailing whitespace lines (${r.trailingWhitespace}).`)

    const e = extOf(file.path)
    if (JS_EXT.has(e)) {
      try {
        const ast = parse(file.text, {
          sourceType: 'unambiguous',
          plugins: [
            'jsx',
            'typescript',
            'classProperties',
            'dynamicImport',
            'optionalChaining',
            'nullishCoalescingOperator',
          ],
          errorRecovery: true,
          ranges: false,
          tokens: false,
        })

        const ids = collectJsIdentifiers(ast)
        const camelCount = ids.filter(isCamelCase).length
        const pascalCount = ids.filter(isPascalCase).length
        if (ids.length > 0 && (camelCount + pascalCount) > 0) {
          namingNotes.push(
            `${file.path}: identifier casing (camelCase=${camelCount}, PascalCase=${pascalCount}, totalIds=${ids.length})`,
          )
        }

        const fnMetrics = computeJsFunctionMetrics(ast)
        for (const m of fnMetrics) {
          if (m.lengthLines >= 60) {
            longFunctions += 1
            addFinding(findings, {
              id: `fn.length:${file.path}:${m.locStart ?? 0}`,
              category: 'code_quality',
              severity: 'medium',
              title: 'Long function',
              message: `Function${m.name ? ` ${m.name}` : ''} is ${m.lengthLines} lines (>= 60).`,
              tool: 'ast',
              ruleId: 'fn.length',
              filePath: file.path,
              line: m.locStart,
            })
          }
          if (m.complexity >= 15) {
            highComplexityFunctions += 1
            addFinding(findings, {
              id: `fn.complexity:${file.path}:${m.locStart ?? 0}`,
              category: 'code_quality',
              severity: 'medium',
              title: 'High complexity function',
              message: `Function${m.name ? ` ${m.name}` : ''} complexity≈${m.complexity} (>= 15).`,
              tool: 'ast',
              ruleId: 'fn.complexity',
              filePath: file.path,
              line: m.locStart,
            })
          }
        }

        if (e === '.js') {
          const messages = eslint.linter.verify(file.text, eslint.config, { filename: file.path })
          for (const msg of messages) {
            eslintIssues += 1
            const sev: Severity = msg.severity === 2 ? 'medium' : 'low'
            addFinding(findings, {
              id: `eslint:${file.path}:${msg.line}:${msg.ruleId ?? 'unknown'}`,
              category: 'code_quality',
              severity: sev,
              title: 'ESLint finding',
              message: msg.message,
              tool: 'eslint',
              ruleId: msg.ruleId ?? undefined,
              filePath: file.path,
              line: msg.line,
            })
          }
        }
      } catch {
        // ignore parse failures
      }
    }
  }

  const dupSignals = duplicationSignals(sampledFiles)
  if (dupSignals > 0) {
    duplicationNotes.push(
      `Detected ${dupSignals} repeated code chunks across sampled files (heuristic; 12-line shingles, >=3 files).`,
    )
    addFinding(findings, {
      id: `duplication:repo:${repo.fullName}`,
      category: 'code_quality',
      severity: 'low',
      title: 'Possible code duplication',
      message: 'Repeated code patterns detected across multiple files (heuristic).',
      tool: 'regex',
      ruleId: 'duplication.shingles',
    })
  }

  const securityFindings = findings.filter((f) => f.category === 'security')
  const secretFindings = securityFindings.filter((f) => f.ruleId?.startsWith('secret.'))
  const unsafeFindings = securityFindings.filter((f) => f.ruleId?.startsWith('unsafe.'))

  const hasBackendSignals = blobPaths.some((p) =>
    [
      'server/',
      'backend/',
      'api/',
      'prisma/',
      'migrations/',
      'schema.prisma',
      'docker-compose.yml',
    ].some((x) => p.toLowerCase().includes(x)),
  )

  const folderNotes: string[] = []
  if (analysisMode === 'limited') {
    folderNotes.push(
      `Analysis Limited: repo classified as ${classification.repoType}; folder structure is treated as content organization, not app architecture.`,
    )
  } else {
    if (blobPaths.some((p) => p.startsWith('src/'))) folderNotes.push('Has src/ directory.')
    if (blobPaths.some((p) => p.startsWith('apps/')) || blobPaths.some((p) => p.startsWith('packages/')))
      folderNotes.push('Monorepo-like structure (apps/ or packages/).')
  }

  const scalability: string[] = []
  if (analysisMode === 'limited') {
    scalability.push(
      `Not applicable: repo classified as ${classification.repoType}; scalability patterns are not meaningful without application logic.`,
    )
  } else {
    if (blobPaths.some((p) => p.includes('redux')) || blobPaths.some((p) => p.includes('zustand')))
      scalability.push('State management library hints detected (redux/zustand).')
    if (blobPaths.some((p) => /react-router/i.test(p))) scalability.push('Routing hints detected (react-router).')
    if (scalability.length === 0) scalability.push('No clear scalability patterns detected from file paths (heuristic).')
  }

  const readmeCompleteness: string[] = []
  if (readmeText) {
    const sections = {
      install: /\b(install|installation)\b/i.test(readmeText),
      usage: /\b(usage|how to)\b/i.test(readmeText),
      contribute: /\b(contributing|contribute)\b/i.test(readmeText),
      license: /\b(license)\b/i.test(readmeText),
    }
    readmeCompleteness.push(
      `README sections detected: install=${sections.install}, usage=${sections.usage}, contributing=${sections.contribute}, license=${sections.license}.`,
    )
  } else {
    readmeCompleteness.push('README content not fetched in sample (may still exist).')
  }

  const authFlaws: string[] = []
  authFlaws.push('Authentication flaws require deeper semantic review; CORE reports only pattern-based signals.')

  if (secretFindings.length === 0) {
    // Keep explicit note for completeness
  }

  if (longLines > 0) readabilityNotes.push(`Found ${longLines} long lines (>120 chars) across sampled files.`)
  if (linesScanned > 0) readabilityNotes.push(`Scanned ~${linesScanned} lines across sampled files.`)

  if (longFunctions > 0) complexityNotes.push(`Long functions flagged: ${longFunctions} (>=60 lines).`)
  if (highComplexityFunctions > 0)
    complexityNotes.push(`High complexity functions flagged: ${highComplexityFunctions} (complexity≈>=15).`)

  // Aggregate severity for repeated poor patterns
  const topSev = findings.reduce((acc, f) => Math.max(acc, severityRank(f.severity)), 0)
  const repeatedPoorPatterns: string[] = []
  if (topSev >= 2) repeatedPoorPatterns.push('Medium/high severity issues present in sampled files.')
  if (eslintIssues > 20) repeatedPoorPatterns.push('Many lint issues detected on sampled JS files.')

  const copiedSignals: string[] = []
  if (dupSignals > 0) copiedSignals.push('Duplicated code chunks across multiple files (heuristic).')

  const overEngineering: string[] = []
  if (blobPaths.filter((p) => /webpack|rollup|vite|parcel/i.test(p)).length >= 3) {
    overEngineering.push('Multiple build systems detected in one repo (heuristic).')
  }

  const hasTests = repo.hasTests
  const hasCI = repo.hasCI
  const hasReadme = repo.hasReadme

  const testPresence: string[] = []
  testPresence.push(hasTests ? 'Test files detected.' : 'No test files detected (heuristic).')
  testPresence.push(hasCI ? 'CI workflows detected.' : 'No CI workflows detected.')

  const testQuality: string[] = []
  testQuality.push(hasTests ? 'Test quality not evaluated in depth (basic version).' : 'N/A (no tests detected).')

  const commentsNotes: string[] = []
  commentsNotes.push('Comment quality is not deeply evaluated; CORE uses lightweight readability signals.')

  const hardcodedNotes: string[] = []
  hardcodedNotes.push(
    secretFindings.length > 0
      ? `Potential secret patterns found: ${secretFindings.length}.`
      : 'No obvious secret patterns matched in sampled files.',
  )

  const unsafeNotes: string[] = []
  unsafeNotes.push(
    unsafeFindings.length > 0
      ? `Unsafe patterns found: ${unsafeFindings.length} (eval/innerHTML/etc).`
      : 'No unsafe patterns matched in sampled files.',
  )

  const backendNotes = {
    applicable: analysisMode === 'limited' ? false : hasBackendSignals,
    schemaDesign:
      analysisMode === 'limited'
        ? [`Not applicable: repo classified as ${classification.repoType}.`]
        : hasBackendSignals
          ? ['Backend/DB signals detected; schema design not deeply assessed in basic version.']
          : ['Not applicable (no backend/DB signals detected).'],
    queryEfficiency:
      analysisMode === 'limited'
        ? [`Not applicable: repo classified as ${classification.repoType}.`]
        : hasBackendSignals
          ? ['Query efficiency not assessed in basic version.']
          : ['Not applicable (no backend/DB signals detected).'],
    apiDesign:
      analysisMode === 'limited'
        ? [`Not applicable: repo classified as ${classification.repoType}.`]
        : hasBackendSignals
          ? ['API design not assessed in basic version.']
          : ['Not applicable (no backend/DB signals detected).'],
  }

  // Sort findings by severity desc then file
  findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || (a.filePath ?? '').localeCompare(b.filePath ?? ''))

  return {
    repoFullName: repo.fullName,
    repoUrl: repo.htmlUrl,
    defaultBranch,
    analyzedAt: Date.now(),

    classification,
    analysisMode,
    criticalInsight,

    summary: {
      primaryLanguages: repo.primaryLanguages,
      filesSampled: sampledFiles.length,
      linesScanned,
      longLines,
      longFunctions,
      highComplexityFunctions,
      duplicationSignals: dupSignals,
      eslintIssues,
      secretFindings: secretFindings.length,
      unsafePatternFindings: unsafeFindings.length,
      hasTests,
      hasCI,
      hasReadme,
    },

    codeQuality: {
      namingConventions: namingNotes.length ? namingNotes : ['No strong naming convention signals found (heuristic).'],
      functionLengthAndComplexity: {
        notes: complexityNotes.length
          ? complexityNotes
          : ['No long/high-complexity functions flagged in sampled JS/TS files.'],
      },
      codeDuplication: {
        notes: duplicationNotes.length ? duplicationNotes : ['No duplication signals detected in sampled files (heuristic).'],
      },
      readabilityAndConsistency: {
        notes: readabilityNotes.length
          ? readabilityNotes
          : ['No notable readability inconsistencies detected in sampled files.'],
      },
    },

    architectureAndDesign: {
      modularityAndSeparation:
        analysisMode === 'limited'
          ? [
              `Not applicable: repo classified as ${classification.repoType}; modularity/separation-of-concerns are not meaningful without application logic.`,
            ]
          : [
              'Modularity is inferred from folder structure and sampled files; deep design review is out of scope for basic CORE.',
            ],
      folderStructure: folderNotes.length ? folderNotes : ['Folder structure signals are limited; no strong patterns detected.'],
      scalabilityPatterns: scalability,
    },

    testingAndReliability: {
      presence: testPresence,
      quality: testQuality,
    },

    documentation: {
      readmeCompleteness,
      commentsAndClarity: commentsNotes,
    },

    securityAndBestPractices: {
      authenticationFlaws: authFlaws,
      hardcodedSecrets: hardcodedNotes,
      unsafePatterns: unsafeNotes,
    },

    databaseAndBackend: backendNotes,

    redFlags: {
      overEngineering: overEngineering.length ? overEngineering : ['No over-engineering signals detected (heuristic).'],
      copiedCodeSignals: copiedSignals.length ? copiedSignals : ['No copied-code signals detected (heuristic).'],
      repeatedPoorPatterns: repeatedPoorPatterns.length
        ? repeatedPoorPatterns
        : ['No repeated poor-pattern signals detected (heuristic).'],
    },

    findings,
    limitations,
  }
}
