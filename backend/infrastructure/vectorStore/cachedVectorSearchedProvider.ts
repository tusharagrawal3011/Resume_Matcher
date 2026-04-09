import crypto from "node:crypto";
import { InMemoryCache } from "../../shared/cache/inMemorycache";
import {
  VectorSearchOptions,
  VectorSearchProvider,
  VectorSearchResult
} from "../../core/interfaces/vectorSearchProvider";
import { logger } from "../../shared/logger/logger";

export class CachedVectorSearchProvider implements VectorSearchProvider {
  private readonly cache: InMemoryCache<VectorSearchResult[]>;

  constructor(
    private readonly provider: VectorSearchProvider,
    ttlMs = 5 * 60 * 1000
  ) {
    this.cache = new InMemoryCache<VectorSearchResult[]>(ttlMs);
  }

  async search(
    queryVector: number[],
    topK: number,
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    const key = crypto
      .createHash("sha256")
      .update(JSON.stringify({ queryVector, topK, options }))
      .digest("hex");

    const cached = this.cache.get(key);
    if (cached) {
      logger.debug("vector search cache hit");
      return cached;
    }

    logger.debug("vector search cache miss");
    const results = await this.provider.search(queryVector, topK, options);
    this.cache.set(key, results);

    return results;
  }
}
