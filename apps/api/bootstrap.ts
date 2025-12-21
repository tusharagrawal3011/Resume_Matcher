import { MatchResumesUseCase } from "../../core/usecases/matchResumesUseCase";
import { OllamaEmbeddingProvider } from "../../infrastructure/llm/ollamaEmbeddingProvider";
import { OllamaLLMProvider } from "../../infrastructure/llm/ollamaLlmProvider";
import { Resume } from "../../core/domain/resume";
import { MongoDBVectorSearchProvider } from "../../infrastructure/vectorStore/mongodbVectorSearchProvider";

export async function createMatchResumesUseCase(resumes: Resume[]) {
  const embeddingProvider = new OllamaEmbeddingProvider();
  const vectorStore = new MongoDBVectorSearchProvider();

  return new MatchResumesUseCase(
    embeddingProvider,
    vectorStore,
    new OllamaLLMProvider()
  );
}
