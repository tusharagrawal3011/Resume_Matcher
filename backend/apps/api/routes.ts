import { Router } from "express";
import { createMatchResumesUseCase } from "./bootstrap";
import { ingestionQueue } from "../../queues/ingestionQueue";
import { ingestResumesSchema, matchResumesSchema } from "./schemas";
import { ZodError } from "zod";

const router = Router();

function buildValidationError(error: ZodError) {
  return {
    error: "Invalid payload",
    details: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }))
  };
}

router.post("/ingest-resumes", async (req, res) => {
  try {
    const parsed = ingestResumesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(buildValidationError(parsed.error));
    }

    const { resumes } = parsed.data;
    const job = await ingestionQueue.add("ingest", { resumes });

    return res.status(202).json({
      status: "queued",
      queue: "resume-ingestion",
      jobId: job.id
    });
  } catch (error) {
    console.error("Failed to enqueue ingestion job", error);
    return res.status(500).json({ error: "Failed to enqueue ingestion job" });
  }
});

router.get("/ingest-resumes/:jobId/status", async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await ingestionQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Ingestion job not found" });
    }

    const state = await job.getState();
    const processedOn = job.processedOn ?? null;
    const finishedOn = job.finishedOn ?? null;
    const durationMs =
      processedOn && finishedOn ? Math.max(0, finishedOn - processedOn) : null;

    return res.json({
      jobId: job.id,
      state,
      failedReason: job.failedReason ?? null,
      processedOn,
      finishedOn,
      durationMs
    });
  } catch (error) {
    console.error("Failed to fetch ingestion job status", error);
    return res.status(500).json({ error: "Failed to fetch ingestion job status" });
  }
});

router.post("/match", async (req, res) => {
  try {
    const parsed = matchResumesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(buildValidationError(parsed.error));
    }

    const { job, resumes, resumeIds, topK } = parsed.data;
    const normalizedTopK = topK ?? 3;

    const useCase = await createMatchResumesUseCase();
    const result = await useCase.execute({
      job,
      resumes,
      resumeIds,
      topK: normalizedTopK
    });

    return res.json(result);
  } catch (error) {
    console.error("Failed to match resumes", error);
    return res.status(500).json({ error: "Failed to match resumes" });
  }
});

export default router;
