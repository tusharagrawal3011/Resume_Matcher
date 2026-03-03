import { MatchResumesUseCase } from "../../core/usecases/matchResumesUseCase";
import { OllamaLLMProvider } from "../../infrastructure/llm/ollamaLlmProvider";
import { RetryingLLMProvider } from "../../infrastructure/llm/retryingLlmProvider";
import { CachedEmbeddingProvider } from "../../infrastructure/llm/cachedEmbeddingProvider";
import { RetryingEmbeddingProvider } from "../../infrastructure/llm/retryingEmbeddingProvider";
import { OllamaEmbeddingProvider } from "../../infrastructure/llm/ollamaEmbeddingProvider";
import { MongoDBVectorSearchProvider } from "../../infrastructure/vectorStore/mongodbVectorSearchProvider";
import { CachedVectorSearchProvider } from "../../infrastructure/vectorStore/cachedVectorSearchedProvider";

export async function createMatchResumesUseCase() {
  const embeddingProvider = new CachedEmbeddingProvider(
    new RetryingEmbeddingProvider(new OllamaEmbeddingProvider(), 2, 30_000)
  );

  const vectorStore = new CachedVectorSearchProvider(new MongoDBVectorSearchProvider());

  const llmProvider = new RetryingLLMProvider(
    new OllamaLLMProvider(),
    2, // retries
    60_000 // timeout
  );

  return new MatchResumesUseCase(embeddingProvider, vectorStore, llmProvider);
}
