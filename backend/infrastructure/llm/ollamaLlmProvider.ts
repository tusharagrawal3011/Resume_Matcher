import { LLMProvider, LLMComparisonResult } from "../../core/interfaces/llmProvider";
import { extractJson } from "../../shared/utils/extractJson";

export class OllamaLLMProvider implements LLMProvider {
  private readonly baseUrl = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  private readonly endpoint = `${this.baseUrl.replace(/\/$/, "")}/api/generate`;
  private readonly model = process.env.OLLAMA_LLM_MODEL?.trim() || "llama3";

  async compare(jobDescription: string, resume: string): Promise<LLMComparisonResult> {
    const prompt = `
You are a hiring assistant.

Compare the following Job Description and Resume.

Return ONLY valid JSON in this exact format:
{
  "score": number between 0 and 1,
  "explanation": string
}

Do not add any text before or after the JSON.

Job Description:
${jobDescription}

Resume:
${resume}
`;

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: "json"
        })
      });
    } catch (error) {
      throw new Error(
        `Failed to connect to Ollama LLM endpoint at ${this.endpoint}: ${(error as Error).message}`
      );
    }

    if (!response.ok) {
      throw new Error(`Ollama LLM request failed (${response.status} ${response.statusText})`);
    }

    const data = await response.json();
    const parsed = extractJson<LLMComparisonResult>(data.response);

    return {
      score: Number(parsed.score),
      explanation: String(parsed.explanation)
    };
  }
}
