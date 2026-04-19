import { getAuditAnalysis } from "../audit/store.js";

// This is a placeholder for a more sophisticated skill mapping system.
const skillToJobKeyword = {
  React: "React Developer",
  TypeScript: "TypeScript Developer",
  "Node.js": "Node.js Developer",
  JavaScript: "JavaScript Developer",
  Python: "Python Developer",
  Java: "Java Developer",
  Go: "Go Developer",
  Rust: "Rust Developer",
  Ruby: "Ruby Developer",
  PHP: "PHP Developer",
  "C#": "C# Developer",
  "C++": "C++ Developer",
  HTML: "Frontend Developer",
  CSS: "Frontend Developer",
  SCSS: "Frontend Developer",
  SQL: "SQL Developer",
  PostgreSQL: "PostgreSQL Developer",
  MongoDB: "MongoDB Developer",
  Docker: "DevOps Engineer",
  Kubernetes: "DevOps Engineer",
  AWS: "AWS Cloud Engineer",
  Azure: "Azure Cloud Engineer",
  GCP: "GCP Cloud Engineer",
};

export async function mapSkillsToJobQueries(
  sessionId: string,
): Promise<string[]> {
  const analysis = await getAuditAnalysis(sessionId);
  if (!analysis) {
    return [];
  }

  const skills = new Set<string>();
  for (const repo of analysis.repos) {
    for (const language of repo.summary.primaryLanguages) {
      skills.add(language);
    }
  }

  const jobQueries = new Set<string>();
  for (const skill of skills) {
    const jobQuery = skillToJobKeyword[skill as keyof typeof skillToJobKeyword];
    if (jobQuery) {
      jobQueries.add(jobQuery);
    }
  }

  return Array.from(jobQueries);
}
