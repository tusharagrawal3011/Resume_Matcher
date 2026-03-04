import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private readonly endpoint = "http://localhost:11434/api/embeddings";
  private readonly model = "nomic-embed-text";

  async embed(text: string): Promise<number[]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error("Failed to generate embedding from Ollama");
    }

    const data = await response.json();
    return data.embedding;
  }
}
