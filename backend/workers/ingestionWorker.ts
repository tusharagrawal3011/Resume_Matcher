import { Worker } from "bullmq";
import { ResumeIngestionService } from "../services/ingestion/resumeIngestion";
import { closeMongoClient } from "../infrastructure/db/mongodbClient";
import { getRedisConnection } from "../queues/redisConnection";
import { logger } from "../shared/logger/logger";

const ingestionService = new ResumeIngestionService();

const worker = new Worker(
  "resume-ingestion",
  async (job) => {
    logger.info({ jobId: job.id }, "Ingestion job started");
    await ingestionService.ingest(job.data.resumes);
    logger.info({ jobId: job.id }, "Ingestion job completed");
  },
  {
    connection: getRedisConnection()
  }
);

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Ingestion job failed");
});

worker.on("error", (err) => {
  logger.error({ err }, "Worker error");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down worker");
  await worker.close();
  await closeMongoClient();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    logger.error({ err: error }, "Worker shutdown failed");
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    logger.error({ err: error }, "Worker shutdown failed");
    process.exit(1);
  });
});
