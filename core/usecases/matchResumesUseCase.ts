import { EmbeddingProvider } from "../interfaces/embeddingProvider";
import { VectorSearchProvider } from "../interfaces/vectorSearchProvider";
import { LLMProvider } from "../interfaces/llmProvider";
import { MatchResumesInput, MatchResumesOutput } from "./matchResumesTypes";
import { CandidateMatch } from "../domain/candidateMatch";

export class MatchResumesUseCase {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorSearchProvider: VectorSearchProvider,
    private readonly llmProvider: LLMProvider
  ) {}

  async execute(input: MatchResumesInput): Promise<MatchResumesOutput> {
    const { job, resumes, topK = 50 } = input;

    // 1️⃣ Embed Job Description
    const jobEmbedding = await this.embeddingProvider.embed(job.content);

    // 2️⃣ Semantic retrieval (reduce problem size)
    const retrieved = await this.vectorSearchProvider.search(
      jobEmbedding,
      Math.min(topK, resumes.length)
    );

    // Create lookup map for resumes
    const resumeMap = new Map(
      resumes.map((r) => [r.id, r]) // assuming Resume has an 'id' field
    );

    const matches: CandidateMatch[] = []; // to hold final matches

    // 3️⃣ Deep comparison using LLM (only on shortlisted resumes)
    for (const candidate of retrieved) {
      const resume = resumeMap.get(candidate.id);
      if (!resume) continue;

      const comparison = await this.llmProvider.compare(
        job.content,
        resume.content
      );

      matches.push({
        resumeId: resume.id,
        score: comparison.score,
        explanation: comparison.explanation
      });
    }

    // 4️⃣ Rank by score (descending)
    matches.sort((a, b) => b.score - a.score);

    return { matches };
  }
}
