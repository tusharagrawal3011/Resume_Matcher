"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, getIngestionStatus, matchResumes, uploadResumes } from "@/lib/api";
import {
  IngestionStatusResponse,
  MatchDecision,
  MatchResponse,
  NonMatchItem,
  ResumeIngestionItem,
  UploadResponse
} from "@/types/match";
import styles from "./page.module.css";

const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const DEFAULT_TOP_K = 3;
const INGESTION_WAIT_TIMEOUT_MS = 90_000;
const INGESTION_POLL_INTERVAL_MS = 2_000;

function makeResumeId(file: File): string {
  const safeName = file.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return `res-${safeName}-${Date.now()}`;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decisionClass(decision: MatchDecision): string {
  if (decision === "STRONG_MATCH") return styles.strongMatch;
  if (decision === "POSSIBLE_MATCH") return styles.possibleMatch;
  return styles.rejectedMatch;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [yearsOfExperience, setYearsOfExperience] = useState(3);
  const [roleType, setRoleType] = useState("backend");
  const [skills, setSkills] = useState("Node.js, Redis, MongoDB");
  const [jobDescription, setJobDescription] = useState("");
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [lastIngestion, setLastIngestion] = useState<UploadResponse | null>(null);
  const [uploadedResumeIds, setUploadedResumeIds] = useState<string[]>([]);
  const [results, setResults] = useState<MatchResponse | null>(null);
  const [nonMatches, setNonMatches] = useState<NonMatchItem[]>([]);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatusResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const pollTokenRef = useRef(0);

  const selectedFileNames = useMemo(() => files.map((file) => file.name), [files]);

  function resetAlerts() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(event.target.files ? Array.from(event.target.files) : []);
  }

  function parseSkills(value: string): string[] {
    return value
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
  }

  async function buildIngestionPayload(): Promise<ResumeIngestionItem[]> {
    const parsedSkills = parseSkills(skills);

    return Promise.all(
      files.map(async (file) => ({
        id: makeResumeId(file),
        pdfBase64: await fileToBase64(file),
        metadata: {
          yearsOfExperience,
          roleType,
          skills: parsedSkills
        }
      }))
    );
  }

  async function waitForIngestionCompletion(jobId: string | number, key: string) {
    const start = Date.now();

    while (Date.now() - start < INGESTION_WAIT_TIMEOUT_MS) {
      const status = await getIngestionStatus(jobId, key);
      setIngestionStatus(status);

      if (status.state === "completed") {
        return status;
      }

      if (status.state === "failed") {
        throw new Error(`Ingestion failed: ${status.failedReason ?? "unknown error"}`);
      }

      await new Promise((resolve) => setTimeout(resolve, INGESTION_POLL_INTERVAL_MS));
    }

    throw new Error("Ingestion is taking too long. Please retry in a few seconds.");
  }

  async function pollIngestionStatus(jobId: string | number, key: string) {
    const myToken = ++pollTokenRef.current;
    const start = Date.now();

    while (Date.now() - start < INGESTION_WAIT_TIMEOUT_MS) {
      if (pollTokenRef.current !== myToken) return;

      try {
        const status = await getIngestionStatus(jobId, key);
        setIngestionStatus(status);

        if (status.state === "completed") {
          const duration = status.durationMs
            ? ` in ${(status.durationMs / 1000).toFixed(2)}s`
            : "";
          setSuccessMessage(`Ingestion completed${duration}.`);
          return;
        }

        if (status.state === "failed") {
          setErrorMessage(`Ingestion failed: ${status.failedReason ?? "unknown error"}`);
          return;
        }
      } catch {
        setErrorMessage("Unable to fetch ingestion status.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, INGESTION_POLL_INTERVAL_MS));
    }
  }

  useEffect(() => {
    return () => {
      pollTokenRef.current += 1;
    };
  }, []);

  async function handleUpload() {
    resetAlerts();

    if (!apiKey.trim()) {
      setErrorMessage("API key is required.");
      return;
    }

    if (files.length === 0) {
      setErrorMessage("Select at least one PDF resume.");
      return;
    }

    setUploading(true);
    try {
      const resumes = await buildIngestionPayload();
      const response = await uploadResumes({ resumes }, apiKey.trim());
      setUploadedResumeIds(resumes.map((resume) => resume.id));
      setLastIngestion(response);
      setIngestionStatus({
        jobId: response.jobId,
        state: "waiting",
        failedReason: null,
        processedOn: null,
        finishedOn: null,
        durationMs: null
      });
      setSuccessMessage(`Ingestion queued successfully. Job ID: ${response.jobId}`);
      void pollIngestionStatus(response.jobId, apiKey.trim());
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(`Upload failed (${error.status}).`);
      } else {
        setErrorMessage("Unexpected upload error.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleMatch() {
    resetAlerts();

    if (!apiKey.trim()) {
      setErrorMessage("API key is required.");
      return;
    }

    if (!jobDescription.trim()) {
      setErrorMessage("Job description is required.");
      return;
    }

    if (uploadedResumeIds.length === 0) {
      setErrorMessage("Upload at least one resume before matching.");
      return;
    }

    if (lastIngestion?.jobId) {
      try {
        await waitForIngestionCompletion(lastIngestion.jobId, apiKey.trim());
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(`Unable to verify ingestion status (${error.status}).`);
        } else if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to verify ingestion status.");
        }
        return;
      }
    }

    setMatching(true);
    try {
      const response = await matchResumes(
        {
          job: {
            id: `job-${Date.now()}`,
            content: jobDescription.trim()
          },
          resumeIds: uploadedResumeIds,
          topK
        },
        apiKey.trim()
      );

      setResults(response);
      setNonMatches(response.nonMatches ?? []);
      setSuccessMessage(`Match request completed. Found ${response.matches.length} candidates.`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(`Match failed (${error.status}).`);
      } else {
        setErrorMessage("Unexpected match error.");
      }
    } finally {
      setMatching(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Resume Matcher Console</p>
        <h1>Ingest Resume PDFs and Match Candidates in Seconds</h1>
        <p className={styles.subtitle}>
          This UI connects directly to your backend queue, vector search, and LLM scoring pipeline.
        </p>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <h2>API Access</h2>
          <label className={styles.label}>x-api-key</label>
          <input
            className={styles.input}
            type="password"
            value={apiKey}
            placeholder="Enter backend API key"
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>

        <div className={styles.card}>
          <h2>Upload Resumes</h2>
          <p className={styles.helper}>Accepted format: PDF only.</p>
          <input className={styles.fileInput} type="file" multiple accept="application/pdf" onChange={onFileChange} />

          <div className={styles.metaGrid}>
            <div>
              <label className={styles.label}>Role Type</label>
              <select
                className={styles.select}
                value={roleType}
                onChange={(event) => setRoleType(event.target.value)}
              >
                <option value="backend">Backend</option>
                <option value="frontend">Frontend</option>
                <option value="fullstack">Fullstack</option>
              </select>
            </div>
            <div>
              <label className={styles.label}>Years of Experience</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={yearsOfExperience}
                onChange={(event) => setYearsOfExperience(Number(event.target.value))}
              />
            </div>
          </div>

          <label className={styles.label}>Skills (comma separated)</label>
          <input
            className={styles.input}
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Node.js, Redis, MongoDB"
          />

          <button className={styles.primaryButton} onClick={handleUpload} disabled={uploading}>
            {uploading ? "Queueing..." : "Queue Ingestion Job"}
          </button>

          {selectedFileNames.length > 0 && (
            <ul className={styles.fileList}>
              {selectedFileNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}

          {lastIngestion && (
            <p className={styles.helper}>
              Last queued job: <strong>{String(lastIngestion.jobId)}</strong>
            </p>
          )}
          {ingestionStatus && (
            <p className={styles.helper}>
              Ingestion status: <strong>{ingestionStatus.state}</strong>
              {ingestionStatus.durationMs !== null && (
                <>
                  {" "}
                  | Duration: <strong>{(ingestionStatus.durationMs / 1000).toFixed(2)}s</strong>
                </>
              )}
            </p>
          )}
          {uploadedResumeIds.length > 0 && (
            <p className={styles.helper}>
              Scoped resume IDs: <strong>{uploadedResumeIds.length}</strong> (only these uploaded
              resumes are considered during matching)
            </p>
          )}
        </div>

        <div className={styles.card}>
          <h2>Match Candidates</h2>
          <label className={styles.label}>Job Description</label>
          <textarea
            className={styles.textarea}
            rows={7}
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Describe the role, must-have skills, and experience level."
          />

          <label className={styles.label}>Top K</label>
          <input
            className={styles.input}
            type="number"
            min={1}
            max={20}
            value={topK}
            onChange={(event) => setTopK(Number(event.target.value) || DEFAULT_TOP_K)}
          />

          <button className={styles.primaryButton} onClick={handleMatch} disabled={matching}>
            {matching ? "Matching..." : "Run Match"}
          </button>
        </div>
      </section>

      {errorMessage && <p className={styles.errorBanner}>{errorMessage}</p>}
      {successMessage && <p className={styles.successBanner}>{successMessage}</p>}

      <section className={styles.resultsCard}>
        <div className={styles.resultsHeader}>
          <h2>Match Results</h2>
          <p>{results ? `${results.matches.length} candidates` : "Run a match to see ranked candidates."}</p>
        </div>

        {results && results.matches.length > 0 ? (
          <div className={styles.resultsList}>
            {results.matches.map((match) => (
              <article key={match.resumeId} className={styles.resultItem}>
                <div className={styles.resultTopRow}>
                  <h3>{match.resumeId}</h3>
                  <span className={`${styles.badge} ${decisionClass(match.decision)}`}>
                    {match.decision.replace("_", " ")}
                  </span>
                </div>
                <p className={styles.score}>Score: {(match.score * 100).toFixed(1)}%</p>
                <p className={styles.explanation}>{match.explanation}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No results yet.</p>
        )}
      </section>

      <section className={styles.resultsCard}>
        <div className={styles.resultsHeader}>
          <h2>Improvement Feedback</h2>
          <p>
            {nonMatches.length > 0
              ? `${nonMatches.length} resumes need improvement`
              : "No rejected resumes in this run."}
          </p>
        </div>
        {nonMatches.length > 0 ? (
          <div className={styles.resultsList}>
            {nonMatches.map((item) => (
              <article key={item.resumeId} className={styles.resultItem}>
                <div className={styles.resultTopRow}>
                  <h3>{item.resumeId}</h3>
                  <span className={`${styles.badge} ${styles.rejectedMatch}`}>Needs Improvement</span>
                </div>
                <p className={styles.score}>Score: {(item.score * 100).toFixed(1)}%</p>
                <p className={styles.explanation}>{item.reason}</p>
                <ul className={styles.fileList}>
                  {item.improvementSuggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No feedback items yet.</p>
        )}
      </section>
    </main>
  );
}
