import { FormEvent, useState } from "react";
import { LabeledField } from "./LabeledField";
import styles from "./console.module.css";
import { MatchSubmitPayload, MatchSubmitResult } from "./types";

type MatchCandidatesFormProps = {
  disabled: boolean;
  loading: boolean;
  uploadedResumeCount: number;
  ingestionReady: boolean;
  onSubmit: (payload: MatchSubmitPayload) => Promise<MatchSubmitResult>;
  onCompleted: (result: MatchSubmitResult) => void;
  latestIngestion: MatchSubmitPayload["ingestionSummary"];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeJobDescription(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

export function MatchCandidatesForm({
  disabled,
  loading,
  uploadedResumeCount,
  ingestionReady,
  onSubmit,
  onCompleted,
  latestIngestion
}: MatchCandidatesFormProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [topK, setTopK] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const normalizedJob = normalizeJobDescription(jobDescription).trim();
  const topKError = topK < 1 || topK > 20 ? "Top K must be between 1 and 20." : null;
  const jobError = normalizedJob.length === 0 ? "Job description is required." : null;

  const canSubmit =
    !disabled && !loading && !jobError && !topKError && uploadedResumeCount > 0 && ingestionReady;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      if (uploadedResumeCount === 0) {
        setError("No resumes available. Upload resumes first.");
        return;
      }
      if (!ingestionReady) {
        setError("Please wait for ingestion to complete before running match.");
        return;
      }
      setError("Please fix the highlighted fields before running match.");
      return;
    }

    const payload: MatchSubmitPayload = {
      form: {
        jobDescription: normalizedJob,
        topK: clamp(topK, 1, 20)
      },
      uploadedResumeIds: latestIngestion?.uploadedResumeIds ?? [],
      ingestionSummary: latestIngestion
    };

    try {
      const result = await onSubmit(payload);
      onCompleted(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Match request failed.");
    }
  }

  return (
    <section className={styles.card}>
      <h2>Match Candidates</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <LabeledField
          label="Job Description"
          htmlFor="job-description"
          helpText="Paste or type role requirements. HTML tags are normalized to plain text."
          errorText={jobError ?? undefined}
        >
          <textarea
            id="job-description"
            className={styles.textarea}
            rows={8}
            value={jobDescription}
            onChange={(event) => setJobDescription(normalizeJobDescription(event.target.value))}
            disabled={disabled || loading}
            placeholder="Describe responsibilities, must-have skills, and expected outcomes."
          />
        </LabeledField>

        <LabeledField
          label="Top K"
          htmlFor="top-k"
          helpText="How many best-fit candidates to show (1-20)."
          errorText={topKError ?? undefined}
        >
          <input
            id="top-k"
            className={styles.input}
            type="number"
            min={1}
            max={20}
            value={topK}
            onChange={(event) => setTopK(clamp(Number(event.target.value), 1, 20))}
            disabled={disabled || loading}
          />
        </LabeledField>

        {error && <p className={styles.errorText}>{error}</p>}

        <button className={styles.primaryButton} type="submit" disabled={!canSubmit}>
          {loading ? "Running match..." : "Run Match"}
        </button>
      </form>
    </section>
  );
}
