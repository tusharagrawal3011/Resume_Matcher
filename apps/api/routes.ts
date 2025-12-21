import { Router } from "express";
import { createMatchResumesUseCase } from "./bootstrap";

const router = Router();

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
    topK: 2
  });

  res.json(result);
});


export default router;
