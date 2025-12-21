import { MatchResumesUseCase } from "../../core/usecases/matchResumesUseCase";
import { OllamaEmbeddingProvider } from "../../infrastructure/llm/ollamaEmbeddingProvider";
import { OllamaLLMProvider } from "../../infrastructure/llm/ollamaLlmProvider";
import { Resume } from "../../core/domain/resume";
import { LocalVectorSearchProvider } from "../../infrastructure/vectorStore/localVectorSearchProvider";

export async function createMatchResumesUseCase(resumes: Resume[]) {
  const embeddingProvider = new OllamaEmbeddingProvider();
  const vectorStore = new LocalVectorSearchProvider();

  // Precompute resume embeddings
  for (const resume of resumes) {
    const embedding = await embeddingProvider.embed(resume.content);
    vectorStore.add(resume.id, embedding);
  }

  return new MatchResumesUseCase(
    embeddingProvider,
    vectorStore,
    new OllamaLLMProvider()
  );
}
