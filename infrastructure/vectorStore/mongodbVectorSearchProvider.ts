import {
  VectorSearchProvider,
  VectorSearchResult
} from "../../core/interfaces/vectorSearchProvider";
import { getResumeCollection } from "../db/mongodbClient";

export class MongoDBVectorSearchProvider implements VectorSearchProvider {
  async search(
    queryVector: number[],
    topK: number
  ): Promise<VectorSearchResult[]> {
    const collection = await getResumeCollection();

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
    return results.map(r => ({
      id: r.resumeId,
      score: r.score,
      content: r.content
    }));
  }
}
