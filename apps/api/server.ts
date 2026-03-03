import { createApp } from "./app";
import { closeIngestionQueue } from "../../queues/ingestionQueue";
import { closeMongoClient } from "../../infrastructure/db/mongodbClient";

const PORT = process.env.PORT || 3000;

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down API...`);

  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  await closeIngestionQueue();
  await closeMongoClient();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error("API shutdown failed:", error);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error("API shutdown failed:", error);
    process.exit(1);
  });
});
