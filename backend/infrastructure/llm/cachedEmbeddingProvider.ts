import crypto from "crypto";
import { InMemoryCache } from "../../shared/cache/inMemorycache";
import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";
import { OllamaEmbeddingProvider } from "./ollamaEmbeddingProvider";

const embeddingCache = new InMemoryCache<number[]>(
  10 * 60 * 1000 // 10 minutes
);

export class CachedEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly provider: EmbeddingProvider = new OllamaEmbeddingProvider()) {}

  async embed(text: string): Promise<number[]> {
    const key = crypto.createHash("sha256").update(text).digest("hex");

    const cached = embeddingCache.get(key);
    if (cached) {
      console.log("CACHE HIT JD embedding");
      return cached;
    }

    console.log("CACHE MISS JD embedding");
    const embedding = await this.provider.embed(text);
    embeddingCache.set(key, embedding);

    return embedding;
  }
}
