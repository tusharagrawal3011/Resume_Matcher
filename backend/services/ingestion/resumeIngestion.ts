import { getResumeCollection } from "../../infrastructure/db/mongodbClient";
import { Resume } from "../../core/domain/resume";
import { parsePdf } from "../../infrastructure/parser/pdfParser";
import { ConcurrencyLimiter } from "../../shared/concurrency/concurrencyLimiter";
import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";
import { createEmbeddingProvider } from "../../infrastructure/llm/providerFactory";
import { RetryingEmbeddingProvider } from "../../infrastructure/llm/retryingEmbeddingProvider";

export type ResumeIngestionItem = {
  id: string;
  content?: string;
  pdfBase64?: string;
  metadata?: Resume["metadata"];
};

export class ResumeIngestionService {
  private readonly embeddingProvider: EmbeddingProvider;
  private readonly limiter = new ConcurrencyLimiter(3);

  constructor(embeddingProvider?: EmbeddingProvider) {
    this.embeddingProvider =
      embeddingProvider ?? new RetryingEmbeddingProvider(createEmbeddingProvider(), 2, 30_000);
  }

  async ingest(items: ResumeIngestionItem[]) {
    const collection = await getResumeCollection();

    await Promise.all(
      items.map((item) =>
        this.limiter.run(async () => {
          const content = await this.resolveContent(item);
          const embedding = await this.embeddingProvider.embed(content);

          await collection.updateOne(
            { resumeId: item.id },
            {
              $set: {
                resumeId: item.id,
                content,
                embedding,
                skills: item.metadata?.skills ?? [],
                yearsOfExperience: item.metadata?.yearsOfExperience ?? 0,
                roleType: item.metadata?.roleType ?? "",
                updatedAt: new Date()
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            { upsert: true }
          );
        })
      )
    );
  }

  private async resolveContent(item: ResumeIngestionItem): Promise<string> {
    if (item.content && item.content.trim().length > 0) {
      return item.content;
    }

    if (item.pdfBase64 && item.pdfBase64.trim().length > 0) {
      const buffer = Buffer.from(item.pdfBase64, "base64");
      return parsePdf(buffer);
    }

    throw new Error(`Resume ${item.id} has neither content nor pdfBase64`);
  }
}
