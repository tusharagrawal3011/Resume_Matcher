import { IngestionSummary } from "./types";
import styles from "./console.module.css";
import { StatusMetric } from "./StatusMetric";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

export function StatusOverview({ summary }: { summary: IngestionSummary | null }) {
  if (!summary) {
    return (
      <section className={styles.card}>
        <h2>Upload Status</h2>
        <p className={styles.emptyState}>No resumes ingested yet.</p>
      </section>
    );
  }

  const status = summary.status;
  const metricVariant =
    status?.state === "completed"
      ? "success"
      : status?.state === "failed"
        ? "danger"
        : status?.state === "active"
          ? "info"
          : "warning";

  return (
    <section className={styles.card}>
      <h2>Upload Status</h2>
      <dl className={styles.metricGrid} role="status" aria-live="polite">
        <StatusMetric
          label="Most recent upload"
          value={`#${String(summary.jobId)} at ${formatTime(summary.uploadAt)}`}
          variant="info"
        />
        <StatusMetric
          label="Ingestion status"
          value={status?.state ?? "waiting"}
          variant={metricVariant}
        />
        <StatusMetric
          label="Duration"
          value={status?.durationMs ? `${(status.durationMs / 1000).toFixed(2)}s` : "Pending"}
          variant={status?.durationMs ? "success" : "default"}
        />
        <StatusMetric
          label="Resumes included in this match"
          value={String(summary.uploadedResumeIds.length)}
          variant="default"
        />
      </dl>
      <div className={styles.scopeCallout} title="Only resumes from the most recent upload are included in match scoring.">
        <strong>i</strong>
        <p>Only resumes from the most recent upload are included in match scoring.</p>
      </div>
    </section>
  );
}
