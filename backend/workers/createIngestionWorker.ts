import { Worker } from "bullmq";
import { ResumeIngestionService } from "../services/ingestion/resumeIngestion";
import { getRedisConnection } from "../queues/redisConnection";
import { logger } from "../shared/logger/logger";

/**
 * Creates and starts a BullMQ ingestion worker.
 * Returns a close() function to shut it down gracefully.
 *
 * Used standalone by ingestionWorker.ts in dev/Railway,
 * and embedded inside server.ts when ENABLE_WORKER=true (e.g. Render).
 */
export function createIngestionWorker(): { close: () => Promise<void> } {
  const ingestionService = new ResumeIngestionService();

  const worker = new Worker(
    "resume-ingestion",
    async (job) => {
      logger.info({ jobId: job.id }, "Ingestion job started");
      await ingestionService.ingest(job.data.resumes);
      logger.info({ jobId: job.id }, "Ingestion job completed");
    },
    { connection: getRedisConnection() }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Ingestion job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Worker error");
  });

  logger.info("Ingestion worker started");

  return {
    close: async () => {
      await worker.close();
      logger.info("Ingestion worker stopped");
    }
  };
}
