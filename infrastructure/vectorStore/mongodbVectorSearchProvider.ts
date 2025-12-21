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
          limit: topK,
          filter: {
            roleType: "backend",
            yearsOfExperience: { $gte: 2 }
          }
        }
      },
      {
        $project: {
          resumeId: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];
    console.log("MongoDB Vector Search Pipeline:", JSON.stringify(pipeline, null, 2));
    const results = await collection.aggregate(pipeline).toArray();
    console.log("MongoDB Vector Search Results:", results);
    return results.map(r => ({
      id: r.resumeId,
      score: r.score
    }));
  }
}
