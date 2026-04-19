import express from "express";
import { generateRoadmap } from "./engine.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const jobId = req.query.jobId as string;
  if (!jobId) {
    return res.status(400).json({ error: "jobId is required" });
  }

  try {
    const roadmap = await generateRoadmap(jobId);
    res.json(roadmap);
  } catch (error) {
    console.error("Failed to generate roadmap:", error);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
});

export const roadmapRouter = router;
