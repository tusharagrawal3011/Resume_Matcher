import { CandidateMatch } from "./candidateMatch";
/*
    Interface representing the result of matching candidates to a job description
*/
export interface MatchResult {
  jobId: string; // ID of the job description
  matches: CandidateMatch[]; // list of candidate matches
  createdAt: Date; // timestamp of when the match was created
}
