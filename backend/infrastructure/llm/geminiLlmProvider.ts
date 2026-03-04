import { LLMComparisonResult, LLMProvider } from "../../core/interfaces/llmProvider";
import { extractJson } from "../../shared/utils/extractJson";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export class GeminiLlmProvider implements LLMProvider {
  private readonly apiKey = process.env.GEMINI_API_KEY?.trim() || "";
  private readonly model = process.env.GEMINI_LLM_MODEL?.trim() || "gemini-2.5-flash";

  async compare(jobDescription: string, resume: string): Promise<LLMComparisonResult> {
    if (!this.apiKey) {
      throw new Error("Missing GEMINI_API_KEY for Gemini LLM provider");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

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
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
    } catch (error) {
      throw new Error(`Failed to connect to Gemini LLM endpoint: ${(error as Error).message}`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Gemini LLM request failed (${response.status} ${response.statusText}): ${errorBody.slice(0, 300)}`
      );
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini LLM response missing candidate content");
    }

    const parsed = extractJson<LLMComparisonResult>(text);
    return {
      score: Number(parsed.score),
      explanation: String(parsed.explanation)
    };
  }
}
