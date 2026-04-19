import express from "express";
import { mapSkillsToJobQueries } from "./mapper.js";
import { getAuditResult } from "../audit/store.js";

const router = express.Router();

router.get("/queries", async (req, res) => {
  const jobId = req.query.jobId as string;
  if (!jobId) {
    return res.status(400).json({ error: "jobId is required" });
  }

  try {
    const jobQueries = await mapSkillsToJobQueries(jobId);
    res.json(jobQueries);
  } catch (error) {
    console.error("Failed to map skills to job queries:", error);
    res.status(500).json({ error: "Failed to map skills to job queries" });
  }
});

// This is a placeholder for a real job board API integration
router.get("/", (req, res) => {
  const jobId = req.query.jobId as string | undefined;
  const mode = (req.query.mode as string | undefined)?.toLowerCase();

  const report = jobId ? getAuditResult(jobId) : undefined;
  const aiResponse = report?.ai?.response as
    | {
        levelEstimate?: { percentile?: number };
        skillGapAnalysis?: Array<{ gap: string }>;
      }
    | undefined;
  const percentile = aiResponse?.levelEstimate?.percentile ?? 52;
  const skillGaps: string[] =
    aiResponse?.skillGapAnalysis?.slice(0, 3).map((g) => g.gap) ?? [];

  const sampleJobs = [
    {
      title: "Frontend Developer",
      company: "Tech Solutions Inc.",
      location: "San Francisco, CA",
      mode: "local",
      description:
        "We are looking for a skilled Frontend Developer to join our team...",
      fitScore: Math.min(98, Math.max(55, percentile + 8)),
      whyMatch: "Strong React/TypeScript signal and portfolio consistency.",
      salaryBand: "$90k - $120k",
      salaryGapHint: "Improve system design + testing depth for next band.",
      skillsToUnlock:
        skillGaps.length > 0 ? skillGaps : ["Testing strategy", "API design"],
      url: "#",
    },
    {
      title: "Backend Developer",
      company: "Data Systems LLC",
      location: "New York, NY",
      mode: "local",
      description:
        "Seeking a Backend Developer with experience in Node.js and databases...",
      fitScore: Math.min(95, Math.max(50, percentile + 3)),
      whyMatch:
        "Solid backend fundamentals with production-oriented growth path.",
      salaryBand: "$100k - $135k",
      salaryGapHint: "Add distributed systems and observability expertise.",
      skillsToUnlock:
        skillGaps.length > 0
          ? skillGaps
          : ["Distributed systems", "Observability"],
      url: "#",
    },
    {
      title: "Remote Full-Stack Engineer",
      company: "Nimbus Remote Labs",
      location: "Remote",
      mode: "remote",
      description:
        "Build end-to-end product features across React and Node.js stack...",
      fitScore: Math.min(96, Math.max(58, percentile + 6)),
      whyMatch: "Balanced frontend/backend footprint aligns with role scope.",
      salaryBand: "$110k - $145k",
      salaryGapHint: "Deepen security and architecture metrics to move up.",
      skillsToUnlock:
        skillGaps.length > 0
          ? skillGaps
          : ["Security engineering", "Architecture patterns"],
      url: "#",
    },
    {
      title: "Remote Platform Engineer",
      company: "OrbitScale",
      location: "Remote",
      mode: "remote",
      description:
        "Improve platform reliability, CI/CD, and service quality gates...",
      fitScore: Math.min(94, Math.max(48, percentile + 1)),
      whyMatch: "Potential fit if CI/testing and reliability gaps are closed.",
      salaryBand: "$120k - $165k",
      salaryGapHint: "Ship stronger CI + reliability metrics for this bracket.",
      skillsToUnlock:
        skillGaps.length > 0
          ? skillGaps
          : ["CI/CD automation", "Reliability engineering"],
      url: "#",
    },
  ];

  const filtered =
    mode === "local" || mode === "remote"
      ? sampleJobs.filter((j) => j.mode === mode)
      : sampleJobs;

  res.json(filtered);
});

export const jobsRouter = router;
