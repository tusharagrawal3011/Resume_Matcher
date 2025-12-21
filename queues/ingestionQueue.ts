import { Queue } from "bullmq";

export const ingestionQueue = new Queue("resume-ingestion", {
  connection: {
    host: "127.0.0.1",
    port: 6379
  }
});
