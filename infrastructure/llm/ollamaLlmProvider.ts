import {
  LLMProvider,
  LLMComparisonResult
} from "../../core/interfaces/llmProvider";
import { extractJson } from "../../shared/utils/extractJson";

export class OllamaLLMProvider implements LLMProvider {
  private readonly endpoint = "http://localhost:11434/api/generate";
  private readonly model = "llama3";

  async compare(
    jobDescription: string,
    resume: string
  ): Promise<LLMComparisonResult> {
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

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error("Ollama LLM request failed");
    }

    const data = await response.json();

    const parsed = extractJson(data.response);

    return {
      score: Number(parsed.score),
      explanation: String(parsed.explanation)
    };
  }
}
