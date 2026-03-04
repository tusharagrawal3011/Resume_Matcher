import { EmbeddingProvider } from "../../core/interfaces/embeddingProvider";
import { LLMProvider } from "../../core/interfaces/llmProvider";
import { GeminiEmbeddingProvider } from "./geminiEmbeddingProvider";
import { GeminiLlmProvider } from "./geminiLlmProvider";
import { OllamaEmbeddingProvider } from "./ollamaEmbeddingProvider";
import { OllamaLLMProvider } from "./ollamaLlmProvider";

type EmbeddingProviderName = "ollama" | "gemini";
type LlmProviderName = "ollama" | "gemini";

function parseEmbeddingProviderName(): EmbeddingProviderName {
  const raw = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase() || "ollama";
  if (raw === "ollama" || raw === "gemini") return raw;
  throw new Error(`Unsupported EMBEDDING_PROVIDER: ${raw}`);
}

function parseLlmProviderName(): LlmProviderName {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase() || "ollama";
  if (raw === "ollama" || raw === "gemini") return raw;
  throw new Error(`Unsupported LLM_PROVIDER: ${raw}`);
}

export function createEmbeddingProvider(): EmbeddingProvider {
  const provider = parseEmbeddingProviderName();
  if (provider === "gemini") return new GeminiEmbeddingProvider();
  return new OllamaEmbeddingProvider();
}

export function createLlmProvider(): LLMProvider {
  const provider = parseLlmProviderName();
  if (provider === "gemini") return new GeminiLlmProvider();
  return new OllamaLLMProvider();
}
