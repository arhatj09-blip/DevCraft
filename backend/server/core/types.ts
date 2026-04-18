export type Severity = 'info' | 'low' | 'medium' | 'high'

export type CoreTechnique = 'regex' | 'ast' | 'eslint'

export type RepoType = 'resource_repo' | 'tutorial_repo' | 'software_project' | 'data_repo'

export type RepoClassification = {
  repoType: RepoType
  confidence: number
  signals: string[]
  metrics: {
    totalFiles: number
    docsAndDataFiles: number
    logicFiles: number
    docsAndDataRatio: number
    logicRatio: number
    hasSrcLikeFolders: boolean
    hasAppLikeFolders: boolean
  }
}

export type CodeFinding = {
  id: string
  severity: Severity
  category:
    | 'code_quality'
    | 'architecture'
    | 'testing'
    | 'documentation'
    | 'security'
    | 'backend'
    | 'red_flags'
  title: string
  message: string
  tool: CoreTechnique
  ruleId?: string
  filePath?: string
  line?: number
  evidence?: string
}

export type RepoAnalysisSummary = {
  primaryLanguages: string[]
  filesSampled: number
  linesScanned: number
  longLines: number
  longFunctions: number
  highComplexityFunctions: number
  duplicationSignals: number
  eslintIssues: number
  secretFindings: number
  unsafePatternFindings: number
  hasTests: boolean
  hasCI: boolean
  hasReadme: boolean
}

export type RepoCodebaseAnalysis = {
  repoFullName: string
  repoUrl: string
  defaultBranch: string
  analyzedAt: number

  classification: RepoClassification
  analysisMode: 'full' | 'limited'
  criticalInsight?: string

  summary: RepoAnalysisSummary

  codeQuality: {
    namingConventions: string[]
    functionLengthAndComplexity: {
      notes: string[]
    }
    codeDuplication: {
      notes: string[]
    }
    readabilityAndConsistency: {
      notes: string[]
    }
  }

  architectureAndDesign: {
    modularityAndSeparation: string[]
    folderStructure: string[]
    scalabilityPatterns: string[]
  }

  testingAndReliability: {
    presence: string[]
    quality: string[]
  }

  documentation: {
    readmeCompleteness: string[]
    commentsAndClarity: string[]
  }

  securityAndBestPractices: {
    authenticationFlaws: string[]
    hardcodedSecrets: string[]
    unsafePatterns: string[]
  }

  databaseAndBackend: {
    applicable: boolean
    schemaDesign: string[]
    queryEfficiency: string[]
    apiDesign: string[]
  }

  redFlags: {
    overEngineering: string[]
    copiedCodeSignals: string[]
    repeatedPoorPatterns: string[]
  }

  findings: CodeFinding[]
  limitations: string[]
}

export type CodebaseAnalysis = {
  jobId: string
  github: {
    inputUrl: string
    kind: 'profile' | 'repo'
    target: string
  }

  engine: {
    name: 'CORE'
    version: 'basic'
    techniques: {
      regexCustomRules: boolean
      astParsing: boolean
      eslint: boolean
      treeSitter: false
      sonarLikeChecks: false
    }
  }

  repos: RepoCodebaseAnalysis[]
  generatedAt: number
  limitations: string[]
}
