import "dotenv/config";
import { createIngestionWorker } from "./createIngestionWorker";
import { closeMongoClient } from "../infrastructure/db/mongodbClient";
import { logger } from "../shared/logger/logger";

const { close } = createIngestionWorker();

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down worker");
  await close();
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
