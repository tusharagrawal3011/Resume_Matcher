import "dotenv/config";
import { MongoClient } from "mongodb";
import { logger } from "../../shared/logger/logger";

function normalizeMongoUri(value: string | undefined): string | undefined {
  if (!value) return value;
  return value
    .trim()
    .replace(/;$/, "")
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1");
}

const MONGO_URI = normalizeMongoUri(process.env.MONGO_URI);
const DB_NAME = "resume_matcher";

let client: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!MONGO_URI) {
    throw new Error("Missing required environment variable: MONGO_URI");
  }

  // Reuse existing connected client
  if (client) return client;

  client = new MongoClient(MONGO_URI, {
    // Automatically reconnect on transient Atlas failures
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    retryWrites: true,
    retryReads: true
  });

  try {
    await client.connect();
    logger.info("MongoDB connected");
  } catch (err) {
    // Clear cached client so next call retries the connection
    client = null;
    throw err;
  }

  // If the driver emits a topology-closed event (e.g. Atlas failover),
  // clear the cached client so the next request triggers a fresh connect
  client.on("topologyClosed", () => {
    logger.warn("MongoDB topology closed — will reconnect on next request");
    client = null;
  });

  return client;
}

export async function getResumeCollection() {
  const c = await getMongoClient();
  return c.db(DB_NAME).collection("resume_vectors");
}

export async function closeMongoClient() {
  if (client) {
    await client.close();
    client = null;
  }
}
