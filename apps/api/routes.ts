import { Router } from "express";
import { createMatchResumesUseCase } from "./bootstrap";
import { ingestionQueue } from "../../queues/ingestionQueue";
import { ingestResumesSchema, matchResumesSchema } from "./schemas";
import { ZodError } from "zod";

const router = Router();

function buildValidationError(error: ZodError) {
  return {
    error: "Invalid payload",
    details: error.issues.map(issue => ({
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

router.post("/match", async (req, res) => {
  try {
    const parsed = matchResumesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(buildValidationError(parsed.error));
    }

    const { job, resumes, topK } = parsed.data;
    const normalizedTopK = topK ?? 3;

    const useCase = await createMatchResumesUseCase();
    const result = await useCase.execute({
      job,
      resumes,
      topK: normalizedTopK
    });

    return res.json(result);
  } catch (error) {
    console.error("Failed to match resumes", error);
    return res.status(500).json({ error: "Failed to match resumes" });
  }
});

export default router;
