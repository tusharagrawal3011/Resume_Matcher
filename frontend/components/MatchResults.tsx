import { MatchDecision, MatchResponse, NonMatchItem } from "@/types/match";
import styles from "./console.module.css";
import { MatchRun } from "./types";

function decisionClass(decision: MatchDecision): string {
  if (decision === "STRONG_MATCH") return styles.strongMatch;
  if (decision === "POSSIBLE_MATCH") return styles.possibleMatch;
  return styles.rejectedMatch;
}

function pointsFromExplanation(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function scoreToPercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

type MatchResultsProps = {
  results: MatchResponse | null;
  nonMatches: NonMatchItem[];
  runHistory: MatchRun[];
};

export function MatchResults({ results, nonMatches, runHistory }: MatchResultsProps) {
  return (
    <>
      <section className={styles.card}>
        <h2>Run History</h2>
        {runHistory.length === 0 ? (
          <p className={styles.emptyState}>No match run yet.</p>
        ) : (
          <div className={styles.historyList}>
            {runHistory.map((run) => {
              const duration =
                run.finishedAt && run.startedAt
                  ? `${((run.finishedAt - run.startedAt) / 1000).toFixed(2)}s`
                  : "-";
              return (
                <article key={run.runId} className={styles.historyItem}>
                  <h3>Run #{run.runId}</h3>
                  <p>Status: {run.status}</p>
                  <p>Duration: {duration}</p>
                  <p>Evaluated: {run.evaluatedResumes ?? "-"}</p>
                  <p>Matched: {run.matchedResumes ?? "-"}</p>
                  {run.errorMessage && <p className={styles.errorText}>{run.errorMessage}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2>Match Results</h2>
        {!results || results.matches.length === 0 ? (
          <p className={styles.emptyState}>No match results yet.</p>
        ) : (
          <div className={styles.resultsList}>
            {results.matches.map((match) => {
              const score = scoreToPercent(match.score);
              return (
                <article key={match.resumeId} className={styles.resultItem}>
                  <div className={styles.resultTopRow}>
                    <h3>{match.resumeId}</h3>
                    <span className={`${styles.badge} ${decisionClass(match.decision)}`}>
                      {match.decision.replace("_", " ")}
                    </span>
                  </div>
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar} style={{ width: `${score}%` }} />
                  </div>
                  <p className={styles.score}>Score: {score}%</p>
                  <ul className={styles.pointList}>
                    {pointsFromExplanation(match.explanation).map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2>Improvement Feedback</h2>
        {nonMatches.length === 0 ? (
          <p className={styles.emptyState}>No feedback items yet.</p>
        ) : (
          <div className={styles.resultsList}>
            {nonMatches.map((item) => (
              <article key={item.resumeId} className={styles.resultItem}>
                <div className={styles.resultTopRow}>
                  <h3>{item.resumeId}</h3>
                  <span className={`${styles.badge} ${styles.rejectedMatch}`}>Needs Improvement</span>
                </div>
                <p className={styles.score}>Score: {scoreToPercent(item.score)}%</p>
                <p className={styles.explanation}>{item.reason}</p>
                <ul className={styles.pointList}>
                  {item.improvementSuggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
