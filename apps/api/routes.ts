import { Router } from "express";
import { createMatchResumesUseCase } from "./bootstrap";
import { ResumeIngestionService } from "../../services/ingestion/resumeIngestion";

const router = Router();

router.post("/ingest-resumes", async (_req, res) => {
  
  const resumes = [
    {
      id: "res-1",
      content: "backend developer using Node.js and APIs",
      metadata: {
        skills: ["Node.js", "APIs"],
        yearsOfExperience: 3
      }
    },
    {
      id: "res-2",
      content: "frontend React engineer",
      metadata: {
        skills: ["React"],
        yearsOfExperience: 2
      }
    },
    {
      id: "res-3",
      content: "distributed systems engineer with cloud experience",
      metadata: {
        skills: ["Distributed Systems", "Cloud"],
        yearsOfExperience: 4
      }
    }
  ];

  const ingestionService = new ResumeIngestionService();
  await ingestionService.ingest(resumes);

  res.json({ status: "resumes ingested successfully" });
});

router.post("/match", async (_req, res) => {
  const resumes = [
    { id: "res-1", content: "backend developer using Node.js and APIs" },
    { id: "res-2", content: "frontend React engineer" },
    { id: "res-3", content: "distributed systems engineer with cloud experience" }
  ];

  const job = {
    id: "job-1",
    content: "Looking for backend engineer with Node.js and distributed systems experience"
  };

  const useCase = await createMatchResumesUseCase(resumes);

  const result = await useCase.execute({
    job,
    resumes,
    topK: 3
  });

  res.json(result);
});

export default router;
