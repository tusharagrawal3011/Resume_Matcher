import { MatchResumesUseCase } from "../../core/usecases/matchResumesUseCase";
import { RetryingLLMProvider } from "../../infrastructure/llm/retryingLlmProvider";
import { CachedEmbeddingProvider } from "../../infrastructure/llm/cachedEmbeddingProvider";
import { RetryingEmbeddingProvider } from "../../infrastructure/llm/retryingEmbeddingProvider";
import { MongoDBVectorSearchProvider } from "../../infrastructure/vectorStore/mongodbVectorSearchProvider";
import { CachedVectorSearchProvider } from "../../infrastructure/vectorStore/cachedVectorSearchedProvider";
import { createEmbeddingProvider, createLlmProvider } from "../../infrastructure/llm/providerFactory";

export async function createMatchResumesUseCase() {
  const embeddingProvider = new CachedEmbeddingProvider(
    new RetryingEmbeddingProvider(createEmbeddingProvider(), 2, 30_000)
  );

  const vectorStore = new CachedVectorSearchProvider(new MongoDBVectorSearchProvider());

  const llmProvider = new RetryingLLMProvider(
    createLlmProvider(),
    2, // retries
    60_000 // timeout
  );

  return new MatchResumesUseCase(embeddingProvider, vectorStore, llmProvider);
}
