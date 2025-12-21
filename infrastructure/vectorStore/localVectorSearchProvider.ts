import {
  VectorSearchProvider,
  VectorSearchResult
} from "../../core/interfaces/vectorSearchProvider";
import { cosineSimilarity } from "./cosineSimilarity";
import { StoredVector } from "./localVectorStore";

export class LocalVectorSearchProvider implements VectorSearchProvider {
  private readonly vectors: StoredVector[] = [];

  add(id: string, vector: number[]) {
    this.vectors.push({ id, vector });
  }

  async search(
    queryVector: number[],
    topK: number
  ): Promise<VectorSearchResult[]> {
    const scored = this.vectors.map((item) => ({
      id: item.id,
      score: cosineSimilarity(queryVector, item.vector)
    }));

    console.log(
  "VECTOR SEARCH SCORES:",
  scored.map(s => ({ id: s.id, score: s.score }))
);

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
