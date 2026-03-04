import {
  IngestionStatusResponse,
  MatchResponse,
  NonMatchItem,
  ResumeIngestionItem
} from "@/types/match";

export type UploadFormValues = {
  roleType: string;
  yearsOfExperience: number;
  skills: string[];
};

export type MatchFormValues = {
  jobDescription: string;
  topK: number;
};

export type IngestionSummary = {
  uploadId: string;
  uploadAt: number;
  jobId: string | number;
  uploadedResumeIds: string[];
  status: IngestionStatusResponse | null;
};

export type MatchRun = {
  runId: string;
  startedAt: number;
  finishedAt?: number;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  evaluatedResumes?: number;
  matchedResumes?: number;
  errorMessage?: string;
};

export type MatchResultsState = {
  response: MatchResponse | null;
  nonMatches: NonMatchItem[];
  runHistory: MatchRun[];
};

export type UploadSubmitPayload = {
  files: File[];
  form: UploadFormValues;
};

export type UploadSubmitResult = {
  queuedJobId: string | number;
  resumes: ResumeIngestionItem[];
};

export type MatchSubmitPayload = {
  form: MatchFormValues;
  uploadedResumeIds: string[];
  ingestionSummary: IngestionSummary | null;
};

export type MatchSubmitResult = {
  run: MatchRun;
  response: MatchResponse;
};
