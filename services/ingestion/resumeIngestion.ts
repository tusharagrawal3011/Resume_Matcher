import { OllamaEmbeddingProvider } from "../../infrastructure/llm/ollamaEmbeddingProvider";
import { getResumeCollection } from "../../infrastructure/db/mongodbClient";
import { Resume } from "../../core/domain/resume";

export class ResumeIngestionService {
  private readonly embeddingProvider = new OllamaEmbeddingProvider();

  async ingest(resumes: Resume[]) {
    const collection = await getResumeCollection();

    for (const resume of resumes) {
      const embedding = await this.embeddingProvider.embed(resume.content);

      await collection.updateOne(
        { resumeId: resume.id },
        {
          $set: {
            resumeId: resume.id,
            content: resume.content,
            embedding,
            skills: resume.metadata?.skills ?? [],
            yearsOfExperience: resume.metadata?.yearsOfExperience ?? 0,
            roleType: resume.metadata?.roleType ?? "",
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    }
  }
}
