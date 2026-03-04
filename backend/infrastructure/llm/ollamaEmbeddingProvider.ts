import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private readonly baseUrl = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  private readonly endpoint = `${this.baseUrl.replace(/\/$/, "")}/api/embeddings`;
  private readonly model = process.env.OLLAMA_EMBED_MODEL?.trim() || "nomic-embed-text";

  async embed(text: string): Promise<number[]> {
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: text
        })
      });
    } catch (error) {
      throw new Error(
        `Failed to connect to Ollama embedding endpoint at ${this.endpoint}: ${(error as Error).message}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Failed to generate embedding from Ollama (${response.status} ${response.statusText})`
      );
    }

    const data = await response.json();
    return data.embedding;
  }
}
