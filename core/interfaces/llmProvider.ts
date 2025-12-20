export interface LLMComparisonResult {
  score: number; // normalized 0–1
  explanation: string; // brief explanation of the comparison
}

/*
    Interface for LLM providers
*/
export interface LLMProvider {
  compare(
    jobDescription: string, // embeddings of the job description
    resume: string // embeddings of the resume
  ): Promise<LLMComparisonResult>;
}
