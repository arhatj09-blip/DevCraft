import { getAuditAnalysis } from "../audit/store.js";
import { skillsDatabase, Skill } from "./database.js";

export type Roadmap = {
  recommendedSkills: Skill[];
  explanation: string;
};

export async function generateRoadmap(jobId: string): Promise<Roadmap> {
  const analysis = await getAuditAnalysis(jobId);
  if (!analysis) {
    throw new Error("Analysis not found");
  }

  const userSkills = new Set<string>();
  analysis.repos.forEach((repo) => {
    repo.summary.primaryLanguages.forEach((lang) =>
      userSkills.add(lang.toLowerCase()),
    );
  });

  const recommendedSkills = skillsDatabase
    .filter((skill) => !userSkills.has(skill.name.toLowerCase()))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  const explanation = `Based on your projects, you have a solid foundation in ${Array.from(userSkills).join(", ")}. To advance your career, we recommend focusing on these high-impact skills.`;

  return {
    recommendedSkills,
    explanation,
  };
}
