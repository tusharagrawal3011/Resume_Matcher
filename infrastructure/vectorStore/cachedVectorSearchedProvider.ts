import crypto from "crypto";
import { InMemoryCache } from "../../shared/cache/inMemorycache";
import {
  VectorSearchProvider,
  VectorSearchResult
} from "../../core/interfaces/vectorSearchProvider";

const searchCache = new InMemoryCache<VectorSearchResult[]>(
  5 * 60 * 1000 // 5 minutes
);

export class CachedVectorSearchProvider
  implements VectorSearchProvider {

  constructor(private readonly provider: VectorSearchProvider) {}

  async search(
    queryVector: number[],
    topK: number
  ): Promise<VectorSearchResult[]> {
    const key = crypto
      .createHash("sha256")
      .update(JSON.stringify({ queryVector, topK }))
      .digest("hex");

    const cached = searchCache.get(key);
    if (cached) {
      console.log("[CACHE HIT] Vector search");
      return cached;
    }

    console.log("[CACHE MISS] Vector search");
    const results = await this.provider.search(queryVector, topK);
    searchCache.set(key, results);

    return results;
  }
}
