import { MatchResumesUseCase } from "../../core/usecases/matchResumesUseCase";
import { OllamaLLMProvider } from "../../infrastructure/llm/ollamaLlmProvider";
import { CachedEmbeddingProvider } from "../../infrastructure/llm/cachedEmbeddingProvider";
import { MongoDBVectorSearchProvider } from "../../infrastructure/vectorStore/mongodbVectorSearchProvider";
import { CachedVectorSearchProvider } from "../../infrastructure/vectorStore/cachedVectorSearchedProvider";

export async function createMatchResumesUseCase() {
const embeddingProvider = new CachedEmbeddingProvider();

const vectorStore = new CachedVectorSearchProvider(
  new MongoDBVectorSearchProvider()
);

  return new MatchResumesUseCase(
    embeddingProvider,
    vectorStore,
    new OllamaLLMProvider()
  );
}
