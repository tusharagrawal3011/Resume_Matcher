import { Queue } from "bullmq";

export const ingestionQueue = new Queue("resume-ingestion", {
  connection: {
    host: "127.0.0.1",
    port: 6379
  },
  defaultJobOptions: {
    // Keep completed jobs for 1 hour (or up to 1000 jobs), then auto-remove.
    removeOnComplete: { age: 60 * 60, count: 1000 },
    // Keep failed jobs for 24 hours for debugging, then auto-remove.
    removeOnFail: { age: 24 * 60 * 60, count: 1000 }
  }
});

export async function closeIngestionQueue() {
  await ingestionQueue.close();
}
