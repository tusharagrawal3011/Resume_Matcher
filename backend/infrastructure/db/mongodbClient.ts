import "dotenv/config";
import { MongoClient } from "mongodb";

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

let client: MongoClient;

export async function getMongoClient() {
  if (!MONGO_URI) {
    throw new Error("Missing required environment variable: MONGO_URI");
  }

  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client;
}

export async function getResumeCollection() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection("resume_vectors");
}

export async function closeMongoClient() {
  if (client) {
    await client.close();
  }
}
