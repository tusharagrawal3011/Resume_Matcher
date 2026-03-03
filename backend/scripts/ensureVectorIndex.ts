import { getResumeCollection } from "../infrastructure/db/mongodbClient";

async function ensureVectorIndex() {
  const collection = await getResumeCollection();

  await collection.createIndex({ resumeId: 1 }, { unique: true, name: "resume_id_unique" });

  const definition = {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: 768,
        similarity: "cosine"
      },
      {
        type: "filter",
        path: "roleType"
      },
      {
        type: "filter",
        path: "yearsOfExperience"
      }
    ]
  };

  try {
    await collection.createSearchIndex({
      name: "vector_index_1",
      type: "vectorSearch",
      definition
    });
    console.log("Created vector search index: vector_index_1");
  } catch (error) {
    const message = String((error as Error).message || "");
    if (message.toLowerCase().includes("already exists")) {
      console.log("Vector search index already exists: vector_index_1");
      return;
    }
    throw error;
  }
}

ensureVectorIndex()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to ensure indexes", err);
    process.exit(1);
  });
