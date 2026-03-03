import { JobDescription } from "../domain/jobDescription";
import { Resume } from "../domain/resume";
import { CandidateMatch } from "../domain/candidateMatch";

export interface MatchResumesInput {
  job: JobDescription;
  resumes?: Resume[];
  resumeIds?: string[];
  topK?: number;
}

export interface MatchResumesOutput {
  matches: CandidateMatch[];
  nonMatches: {
    resumeId: string;
    score: number;
    reason: string;
    improvementSuggestions: string[];
  }[];
}
