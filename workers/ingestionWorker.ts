import { Worker } from "bullmq";
import { ResumeIngestionService } from "../services/ingestion/resumeIngestion";

const ingestionService = new ResumeIngestionService();

const worker = new Worker(
  "resume-ingestion",
  async job => {
    console.log("Ingestion job started:", job.id);
    await ingestionService.ingest(job.data.resumes);
    console.log("Ingestion job completed:", job.id);
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379
    }
  }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed`, err);
});

worker.on("error", err => {
  console.error("Worker error:", err);
});
