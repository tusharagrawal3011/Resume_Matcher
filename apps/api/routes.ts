import { Router } from "express";
import { createMatchResumesUseCase } from "./bootstrap";
import { ingestionQueue } from "../../queues/ingestionQueue";
import { Resume } from "../../core/domain/resume";
import { JobDescription } from "../../core/domain/jobDescription";

const router = Router();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isResume(value: unknown): value is Resume {
  if (!value || typeof value !== "object") return false;
  const resume = value as Resume;
  return isNonEmptyString(resume.id) && isNonEmptyString(resume.content);
}

function isJob(value: unknown): value is JobDescription {
  if (!value || typeof value !== "object") return false;
  const job = value as JobDescription;
  return isNonEmptyString(job.id) && isNonEmptyString(job.content);
}

router.post("/ingest-resumes", async (req, res) => {
  try {
    const resumes = req.body?.resumes;
    if (!Array.isArray(resumes) || resumes.length === 0 || !resumes.every(isResume)) {
      return res.status(400).json({
        error: "Invalid payload. Expected { resumes: Resume[] } with non-empty id/content."
      });
    }

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
    const { job, resumes, topK } = req.body ?? {};

    if (!isJob(job)) {
      return res.status(400).json({
        error: "Invalid payload. Expected job with non-empty id/content."
      });
    }

    if (resumes !== undefined && (!Array.isArray(resumes) || !resumes.every(isResume))) {
      return res.status(400).json({
        error: "Invalid payload. Expected resumes?: Resume[] with non-empty id/content."
      });
    }

    const normalizedTopK =
      typeof topK === "number" && Number.isFinite(topK) && topK > 0
        ? Math.floor(topK)
        : 3;

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
