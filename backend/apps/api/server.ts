import { createApp } from "./app";
import { closeIngestionQueue } from "../../queues/ingestionQueue";
import { closeMongoClient } from "../../infrastructure/db/mongodbClient";
import { createIngestionWorker } from "../../workers/createIngestionWorker";
import { logger } from "../../shared/logger/logger";

const PORT = process.env.PORT || 3000;

const app = createApp();

// When ENABLE_WORKER=true the API process also runs the BullMQ worker.
// Useful on platforms where only one process is available (e.g. Render free tier).
let closeWorker: (() => Promise<void>) | null = null;
if (process.env.ENABLE_WORKER === "true") {
  logger.info("ENABLE_WORKER=true — starting embedded ingestion worker");
  const worker = createIngestionWorker();
  closeWorker = worker.close;
}

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "API running");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down API");

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  if (closeWorker) await closeWorker();
  await closeIngestionQueue();
  await closeMongoClient();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    logger.error({ err: error }, "API shutdown failed");
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    logger.error({ err: error }, "API shutdown failed");
    process.exit(1);
  });
});
