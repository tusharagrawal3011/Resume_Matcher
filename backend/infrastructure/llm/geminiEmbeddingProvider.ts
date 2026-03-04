import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";

type GeminiEmbeddingResponse = {
  embedding?: {
    values?: number[];
  };
};

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private readonly apiKey = process.env.GEMINI_API_KEY?.trim() || "";
  private readonly model = process.env.GEMINI_EMBED_MODEL?.trim() || "gemini-embedding-001";

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error("Missing GEMINI_API_KEY for Gemini embedding provider");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: {
            parts: [{ text }]
          }
        })
      });
    } catch (error) {
      throw new Error(`Failed to connect to Gemini embedding endpoint: ${(error as Error).message}`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Gemini embedding request failed (${response.status} ${response.statusText}): ${errorBody.slice(0, 300)}`
      );
    }

    const data = (await response.json()) as GeminiEmbeddingResponse;
    const values = data.embedding?.values;
    if (!values || !Array.isArray(values) || values.length === 0) {
      throw new Error("Gemini embedding response missing embedding values");
    }
    return values;
  }
}
