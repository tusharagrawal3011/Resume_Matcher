import { IngestionStatusResponse } from "@/types/match";
import styles from "./console.module.css";

function formatTimestamp(value: number | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString();
}

function describeStatus(status: IngestionStatusResponse | null): {
  title: string;
  detail: string;
  progress: number;
  tone: "default" | "running" | "done" | "failed";
} {
  if (!status) {
    return {
      title: "Waiting for upload",
      detail: "Upload resumes to start ingestion.",
      progress: 0,
      tone: "default"
    };
  }

  if (status.state === "failed") {
    return {
      title: "Ingestion failed",
      detail: status.failedReason ?? "The worker failed to process uploaded resumes.",
      progress: 100,
      tone: "failed"
    };
  }

  if (status.state === "completed") {
    return {
      title: "Ready to match",
      detail: "All uploaded resumes are indexed and available for matching.",
      progress: 100,
      tone: "done"
    };
  }

  if (status.state === "active") {
    return {
      title: "Processing resumes",
      detail: "Extracting text and indexing vectors.",
      progress: 70,
      tone: "running"
    };
  }

  if (status.state === "waiting" || status.state === "delayed" || status.state === "paused") {
    return {
      title: "Queued",
      detail: "Upload accepted and waiting for worker.",
      progress: 35,
      tone: "running"
    };
  }

  return {
    title: "Preparing ingestion",
    detail: "Pipeline is setting up processing.",
    progress: 15,
    tone: "default"
  };
}

export function PipelineStepper({ status }: { status: IngestionStatusResponse | null }) {
  const state = describeStatus(status);

  return (
    <section className={styles.card}>
      <h2>Ingestion Progress</h2>
      <div className={styles.pipelineHeader}>
        <p className={styles.pipelineTitle}>{state.title}</p>
        <span className={styles.pipelinePercent}>{state.progress}%</span>
      </div>
      <div className={styles.pipelineTrack} aria-hidden>
        <div
          className={`${styles.pipelineFill} ${
            state.tone === "failed"
              ? styles.pipelineFailed
              : state.tone === "done"
                ? styles.pipelineDone
                : styles.pipelineRunning
          }`}
          style={{ width: `${state.progress}%` }}
        />
      </div>
      <p className={styles.pipelineDetail}>{state.detail}</p>
      {status && (
        <div className={styles.timelineMeta}>
          <p>Started: {formatTimestamp(status.processedOn)}</p>
          <p>Finished: {formatTimestamp(status.finishedOn)}</p>
        </div>
      )}
    </section>
  );
}
