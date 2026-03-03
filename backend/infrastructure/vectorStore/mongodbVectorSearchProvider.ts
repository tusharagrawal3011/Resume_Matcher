import {
  VectorSearchOptions,
  VectorSearchProvider,
  VectorSearchResult
} from "../../core/interfaces/vectorSearchProvider";
import { getResumeCollection } from "../db/mongodbClient";
import { cosineSimilarity } from "./cosineSimilarity";

export class MongoDBVectorSearchProvider implements VectorSearchProvider {
  async search(
    queryVector: number[],
    topK: number,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    const collection = await getResumeCollection();

    if (options?.resumeIds && options.resumeIds.length > 0) {
      const docs = await collection
        .find({
          resumeId: { $in: options.resumeIds }
        })
        .project({
          _id: 0,
          resumeId: 1,
          content: 1,
          embedding: 1
        })
        .toArray();

      const ranked = docs
        .filter((doc) => Array.isArray(doc.embedding) && doc.embedding.length > 0)
        .map((doc) => ({
          id: doc.resumeId as string,
          content: doc.content as string | undefined,
          score: cosineSimilarity(queryVector, doc.embedding as number[])
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      return ranked;
    }

    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index_1",
          path: "embedding",
          queryVector,
          numCandidates: 100,
          limit: topK
        }
      },
      {
        $project: {
          resumeId: 1,
          content: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];
    const results = await collection.aggregate(pipeline).toArray();
    return results.map((r) => ({
      id: r.resumeId,
      score: r.score,
      content: r.content
    }));
  }
}
