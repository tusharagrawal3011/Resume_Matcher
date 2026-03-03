import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI;
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
