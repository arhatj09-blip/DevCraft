import type { AuditReport } from "./report.js";
import type { DataCollection } from "./collection.js";
import type { CodebaseAnalysis } from "./analysis.js";

export function generateTestAuditReport(_jobId: string): AuditReport {
  return {
    summary: {
      score: 7.2,
      level: "Intermediate",
      verdict:
        "Good codebase with room for improvement in code quality and security practices.",
    },
    projects: [
      {
        name: "DevCraft",
        url: "https://github.com/test/devcraft",
        score: 7.5,
        strengths: [
          "Good project structure and organization",
          "Comprehensive TypeScript usage",
          "React-based modern frontend",
        ],
        weaknesses: [
          "Missing error handling in some async operations",
          "Could use more unit tests",
          "Some functions exceed recommended length",
        ],
        issues: [
          {
            title: "Long function detected",
            severity: "medium",
            category: "Code Quality",
            ruleId: "LONG_FUNCTION",
            example: "runAudit function is 200+ lines",
          },
          {
            title: "Missing null checks",
            severity: "low",
            category: "Best Practices",
            ruleId: "NULL_SAFETY",
            example: "Several API responses not validated",
          },
        ],
      },
    ],
    liveApp: {
      url: "http://localhost:5175",
      performanceScore: 85,
      accessibilityScore: 78,
      notes: [
        "Good lighthouse performance",
        "Some accessibility improvements needed",
      ],
    },
    strengths: [
      {
        title: "Modern Stack",
        evidence: "Uses TypeScript, React, Express, and modern build tools",
      },
      {
        title: "Good Architecture",
        evidence: "Clear separation between frontend and backend concerns",
      },
    ],
    weaknesses: [
      {
        title: "Limited error handling in async flows",
      },
      {
        title: "Some functions too long",
      },
    ],
    ai: {
      modelUsed: "gpt-4-preview",
      cached: false,
      response: {
        summary: "Well-structured full-stack application with good potential",
        careerInsights: {
          suitableRoles: [
            {
              role: "Full Stack Developer",
              why: [
                "Good mix of backend and frontend skills",
                "Strong TypeScript knowledge",
              ],
            },
            {
              role: "Backend Developer",
              why: ["Well-structured server code", "Good API design"],
            },
          ],
          notReadyFor: [
            {
              role: "DevOps Engineer",
              why: ["Limited infrastructure/deployment experience shown"],
            },
          ],
        },
        resumeInsights: {
          highlightTheseProjects: [
            {
              name: "DevCraft - Full Stack Audit Tool",
              reason:
                "Demonstrates full-stack capabilities and system design thinking",
            },
          ],
          improveOrRemove: [
            {
              name: "Old portfolio projects",
              reason:
                "Focus on recent work that better represents current skills",
            },
          ],
          bulletRewrite: [
            {
              before: "Worked on React components for the frontend",
              after:
                "Architected and implemented 12+ React components with Redux state management, reducing API calls by 40%",
            },
          ],
        },
        skillRoadmap: {
          currentSkills: ["TypeScript", "React", "Node.js", "Express"],
          recommendedNext: [
            "Docker",
            "Kubernetes",
            "Advanced TypeScript Patterns",
            "GraphQL",
          ],
          timeline: "6-12 months",
        },
      },
    },
  } as unknown as AuditReport;
}

export function generateTestDataCollection(_jobId: string): DataCollection {
  return {
    github: {
      inputUrl: "https://github.com/arhatj09-blip/DevCraft",
      kind: "repo",
      target: "arhatj09-blip/DevCraft",
      repoIndex: [
        {
          fullName: "arhatj09-blip/DevCraft",
          htmlUrl: "https://github.com/arhatj09-blip/DevCraft",
          stars: 42,
          forks: 8,
          pushedAt: new Date().toISOString(),
        },
      ],
      repos: [
        {
          fullName: "arhatj09-blip/DevCraft",
          htmlUrl: "https://github.com/arhatj09-blip/DevCraft",
          defaultBranch: "main",
          pushedAt: new Date().toISOString(),
          stars: 42,
          forks: 8,
          primaryLanguages: ["TypeScript", "React", "Express"],
          fileCount: 45,
          topLevelFolders: ["src", "server", "public"],
          hasTests: true,
          hasCI: false,
          hasReadme: true,
          largestFiles: [
            { path: "server/audit/store.ts", size: 15000 },
            { path: "src/pages/results_dashboard.ts", size: 12000 },
          ],
        },
      ],
      totalRepos: 1,
      detailedRepos: 1,
      truncated: false,
      limitations: [
        "Test data generated for demonstration",
        "Actual GitHub API calls may yield different results",
      ],
    },
    limitations: ["Test data generated for demonstration"],
    generatedAt: Date.now(),
  } as unknown as DataCollection;
}

export function generateTestCodebaseAnalysis(jobId: string): CodebaseAnalysis {
  return {
    jobId,
    github: {
      inputUrl: "https://github.com/arhatj09-blip/DevCraft",
      kind: "repo",
      target: "arhatj09-blip/DevCraft",
    },
    engine: {
      name: "CORE",
      version: "basic",
      techniques: {
        regexCustomRules: true,
        astParsing: true,
        eslint: true,
        treeSitter: false,
        sonarLikeChecks: false,
      },
    },
    repos: [
      {
        repoFullName: "arhatj09-blip/DevCraft",
        summary: {
          unsafePatternFindings: 3,
          secretFindings: 0,
          primaryLanguages: ["TypeScript", "React", "Express"],
          filesSampled: 30,
          linesScanned: 8500,
          longLines: 12,
          longFunctions: 5,
          eslintIssues: 8,
          hasTests: true,
          hasCI: false,
          hasReadme: true,
        },
        findings: [
          {
            category: "Code Quality",
            severity: "medium",
            title: "Function exceeds 50 lines",
            message: "runAudit function is too long, consider breaking it down",
            filePath: "server/audit/store.ts",
            line: 82,
          },
          {
            category: "Best Practices",
            severity: "low",
            title: "Missing error handling",
            message: "Async operation without proper error boundary",
            filePath: "src/pages/career_insights.ts",
            line: 280,
          },
        ],
      },
    ],
    generatedAt: Date.now(),
    limitations: [
      "This is test data - actual analysis may differ",
      "Limited to sampled files due to performance constraints",
    ],
  } as unknown as CodebaseAnalysis;
}
