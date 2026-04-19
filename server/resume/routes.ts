import express from "express";
import { optimizeResume } from "./optimizer";

const router = express.Router();

router.get("/optimize", async (req, res) => {
  const jobId = req.query.jobId as string;
  if (!jobId) {
    return res.status(400).send({ error: "Job ID is required" });
  }

  try {
    const optimizedData = await optimizeResume(jobId);
    res.json(optimizedData);
  } catch (error) {
    console.error(`Failed to optimize resume for job ${jobId}:`, error);
    if (error instanceof Error) {
      res.status(500).send({ error: error.message });
    } else {
      res.status(500).send({ error: "An unknown error occurred" });
    }
  }
});

export default router;
