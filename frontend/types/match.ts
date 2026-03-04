export type MatchDecision = "STRONG_MATCH" | "POSSIBLE_MATCH" | "REJECTED";

export type ResumeMetadata = {
  yearsOfExperience?: number;
  skills?: string[];
  location?: string;
  roleType?: string;
};

export type ResumeIngestionItem = {
  id: string;
  content?: string;
  pdfBase64?: string;
  metadata?: ResumeMetadata;
};

export type UploadRequest = {
  resumes: ResumeIngestionItem[];
};

export type UploadResponse = {
  status: "queued";
  queue: string;
  jobId: string | number;
};

export type IngestionJobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused"
  | "waiting-children"
  | "unknown";

export type IngestionStatusResponse = {
  jobId: string | number;
  state: IngestionJobState;
  failedReason: string | null;
  processedOn: number | null;
  finishedOn: number | null;
  durationMs: number | null;
};

export type MatchRequest = {
  job: {
    id: string;
    content: string;
  };
  resumeIds?: string[];
  topK?: number;
};

export type MatchResultItem = {
  resumeId: string;
  score: number;
  decision: MatchDecision;
  explanation: string;
};

export type NonMatchItem = {
  resumeId: string;
  score: number;
  reason: string;
  improvementSuggestions: string[];
};

export type MatchResponse = {
  matches: MatchResultItem[];
  nonMatches: NonMatchItem[];
};
