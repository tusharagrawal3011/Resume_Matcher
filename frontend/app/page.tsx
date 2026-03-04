"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, getIngestionStatus, matchResumes, uploadResumes } from "@/lib/api";
import { MatchResponse, ResumeIngestionItem } from "@/types/match";
import styles from "./page.module.css";
import { UploadResumesForm } from "@/components/UploadResumesForm";
import { MatchCandidatesForm } from "@/components/MatchCandidatesForm";
import { MatchResults } from "@/components/MatchResults";
import {
  IngestionSummary,
  MatchRun,
  MatchSubmitPayload,
  MatchSubmitResult,
  UploadSubmitPayload,
  UploadSubmitResult
} from "@/components/types";
import { StatusOverview } from "@/components/StatusOverview";
import { PipelineStepper } from "@/components/PipelineStepper";
import { ToastItem, ToastStack } from "@/components/ToastStack";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY?.trim() || "rm_local_dev_key_2026";
const INGESTION_WAIT_TIMEOUT_MS = 90_000;
const INGESTION_POLL_INTERVAL_MS = 2_000;

function makeResumeId(file: File): string {
  const safeName = file.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return `res-${safeName}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function Home() {
  const [ingestionSummary, setIngestionSummary] = useState<IngestionSummary | null>(null);
  const [matchResponse, setMatchResponse] = useState<MatchResponse | null>(null);
  const [nonMatches, setNonMatches] = useState<MatchResponse["nonMatches"]>([]);
  const [runHistory, setRunHistory] = useState<MatchRun[]>([]);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pollTokenRef = useRef(0);
  const toastIdRef = useRef(0);
  const runCounterRef = useRef(0);
  const uploadCounterRef = useRef(0);

  const uploadedResumeCount = ingestionSummary?.uploadedResumeIds.length ?? 0;
  const ingestionReady = ingestionSummary?.status?.state === "completed";

  const latestRun = useMemo(() => runHistory[0] ?? null, [runHistory]);

  function addToast(kind: ToastItem["kind"], message: string) {
    const id = String(++toastIdRef.current);
    setToasts((prev) => [{ id, kind, message }, ...prev].slice(0, 4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }

  function apiErrorMessage(prefix: string, error: ApiError): string {
    const details =
      error.details && typeof error.details === "object" && "error" in (error.details as object)
        ? String((error.details as { error?: unknown }).error ?? "")
        : "";
    if (details) return `${prefix} (${error.status}): ${details}`;
    return `${prefix} (${error.status}).`;
  }

  useEffect(() => {
    return () => {
      pollTokenRef.current += 1;
    };
  }, []);

  async function pollIngestionStatus(jobId: string | number) {
    const token = ++pollTokenRef.current;
    const start = Date.now();

    while (Date.now() - start < INGESTION_WAIT_TIMEOUT_MS) {
      if (pollTokenRef.current !== token) return;

      try {
        const status = await getIngestionStatus(jobId, API_KEY);
        setIngestionSummary((prev) =>
          prev
            ? {
                ...prev,
                status
              }
            : prev
        );

        if (status.state === "completed") {
          const duration = status.durationMs
            ? ` in ${(status.durationMs / 1000).toFixed(2)}s`
            : "";
          addToast("success", `Upload processing completed${duration}.`);
          return;
        }

        if (status.state === "failed") {
          addToast("error", `Upload failed: ${status.failedReason ?? "unknown error"}`);
          return;
        }
      } catch {
        addToast("error", "Unable to fetch upload status.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, INGESTION_POLL_INTERVAL_MS));
    }

    addToast("info", "Upload is still processing. You can retry matching shortly.");
  }

  async function handleUploadSubmit(payload: UploadSubmitPayload): Promise<UploadSubmitResult> {
    setUploading(true);
    const resumes: ResumeIngestionItem[] = await Promise.all(
      payload.files.map(async (file) => ({
        id: makeResumeId(file),
        pdfBase64: await fileToBase64(file),
        metadata: {
          roleType: payload.form.roleType,
          yearsOfExperience: payload.form.yearsOfExperience,
          skills: payload.form.skills
        }
      }))
    );

    try {
      const queued = await uploadResumes({ resumes }, API_KEY);
      const summary: IngestionSummary = {
        uploadId: String(++uploadCounterRef.current),
        uploadAt: Date.now(),
        jobId: queued.jobId,
        uploadedResumeIds: resumes.map((resume) => resume.id),
        status: {
          jobId: queued.jobId,
          state: "waiting",
          failedReason: null,
          processedOn: null,
          finishedOn: null,
          durationMs: null
        }
      };
      setIngestionSummary(summary);
      setMatchResponse(null);
      setNonMatches([]);
      addToast("success", `Upload queued. Most recent upload: #${String(queued.jobId)}.`);
      void pollIngestionStatus(queued.jobId);
      return { queuedJobId: queued.jobId, resumes };
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(apiErrorMessage("Queue failed", error));
      }
      throw new Error("Queue failed unexpectedly.");
    } finally {
      setUploading(false);
    }
  }

  function onUploadQueued(result: UploadSubmitResult) {
    addToast("info", `Upload accepted with job ID ${String(result.queuedJobId)}.`);
  }

  async function handleMatchSubmit(payload: MatchSubmitPayload): Promise<MatchSubmitResult> {
    if (!payload.ingestionSummary) {
      throw new Error("No upload is available yet.");
    }

    setMatching(true);
    const runNumber = ++runCounterRef.current;
    const run: MatchRun = {
      runId: String(runNumber),
      startedAt: Date.now(),
      status: "RUNNING"
    };
    setRunHistory((prev) => [run, ...prev]);

    try {
      const status = await getIngestionStatus(payload.ingestionSummary.jobId, API_KEY);
      setIngestionSummary((prev) => (prev ? { ...prev, status } : prev));

      if (status.state !== "completed") {
        if (status.state === "failed") {
          throw new Error(`Upload failed: ${status.failedReason ?? "unknown error"}`);
        }
        throw new Error(`Upload is ${status.state}. Please wait for completion.`);
      }

      const response = await matchResumes(
        {
          job: {
            id: `job-${Date.now()}`,
            content: payload.form.jobDescription
          },
          resumeIds: payload.uploadedResumeIds,
          topK: payload.form.topK
        },
        API_KEY
      );

      const completedRun: MatchRun = {
        ...run,
        finishedAt: Date.now(),
        status: "COMPLETED",
        evaluatedResumes: payload.uploadedResumeIds.length,
        matchedResumes: response.matches.length
      };

      setRunHistory((prev) => [completedRun, ...prev.filter((entry) => entry.runId !== run.runId)]);
      setMatchResponse(response);
      setNonMatches(response.nonMatches ?? []);
      addToast("success", `Match completed. ${response.matches.length} best-fit candidates found.`);
      return { run: completedRun, response };
    } catch (error) {
      if (error instanceof ApiError) {
        const errorMessage = apiErrorMessage("Match run failed", error);
        const failedRun: MatchRun = {
          ...run,
          finishedAt: Date.now(),
          status: "FAILED",
          errorMessage
        };
        setRunHistory((prev) => [failedRun, ...prev.filter((entry) => entry.runId !== run.runId)]);
        addToast("error", errorMessage);
        throw new Error(errorMessage);
      }

      const errorMessage = error instanceof Error ? error.message : "Match run failed.";
      const failedRun: MatchRun = {
        ...run,
        finishedAt: Date.now(),
        status: "FAILED",
        errorMessage
      };
      setRunHistory((prev) => [failedRun, ...prev.filter((entry) => entry.runId !== run.runId)]);
      addToast("error", errorMessage);
      throw new Error(errorMessage);
    } finally {
      setMatching(false);
    }
  }

  function onMatchCompleted(result: MatchSubmitResult) {
    setMatchResponse(result.response);
    setNonMatches(result.response.nonMatches ?? []);
  }

  return (
    <main className={styles.page}>
      <ToastStack toasts={toasts} />

      <section className={styles.hero}>
        <p className={styles.kicker}>Resume Matcher</p>
        <h1>Recruiter-Friendly Candidate Matching Workspace</h1>
        <p className={styles.subtitle}>
          Upload resumes, monitor processing, and run explainable candidate matches with clear
          feedback.
        </p>
      </section>

      <section className={styles.grid}>
        <StatusOverview summary={ingestionSummary} />
        <PipelineStepper status={ingestionSummary?.status ?? null} />
      </section>

      <section className={styles.grid}>
        <UploadResumesForm
          disabled={matching}
          loading={uploading}
          onSubmit={handleUploadSubmit}
          onQueued={onUploadQueued}
        />
        <MatchCandidatesForm
          disabled={uploading}
          loading={matching}
          uploadedResumeCount={uploadedResumeCount}
          ingestionReady={ingestionReady}
          latestIngestion={ingestionSummary}
          onSubmit={handleMatchSubmit}
          onCompleted={onMatchCompleted}
        />
      </section>

      <MatchResults results={matchResponse} nonMatches={nonMatches} runHistory={runHistory} />

      {latestRun?.status === "RUNNING" && (
        <p className={styles.helper}>Match run in progress. Results will appear automatically.</p>
      )}
    </main>
  );
}
