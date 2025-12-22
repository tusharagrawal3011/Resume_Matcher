import { MatchDecision } from "../core/domain/matchDecision";

export type EvaluationInput = {
  vectorScore: number;
  llmScore: number;
};

export type EvaluationResult = {
  finalScore: number;
  decision: MatchDecision;
};

export class MatchEvaluator {
  evaluate(input: EvaluationInput): EvaluationResult {
    const finalScore =
      (input.vectorScore * 0.6) +
      (input.llmScore * 0.4);

    if (finalScore >= 0.75) {
      return { finalScore, decision: "STRONG_MATCH" };
    }

    if (finalScore >= 0.55) {
      return { finalScore, decision: "POSSIBLE_MATCH" };
    }

    return { finalScore, decision: "REJECTED" };
  }
}
