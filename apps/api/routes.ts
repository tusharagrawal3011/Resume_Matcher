import { Router } from "express";
import { createMatchResumesUseCase } from "./bootstrap";

const router = Router();

router.post("/match", async (req, res) => {
  const resumes = [
    { id: "res-1", content: "backend developer using Node.js" },
    { id: "res-2", content: "frontend React engineer" }
  ];

  const job = {
    id: "job-1",  
    content: "Looking for backend engineer with Node.js experience"
  };

  const useCase = createMatchResumesUseCase(
    resumes.map((r) => r.id)
  );

  const result = await useCase.execute({
    job,
    resumes
  });

  res.json(result);
});

export default router;
