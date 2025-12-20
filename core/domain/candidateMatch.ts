/* 
    Interface representing a candidate match result
*/
export interface CandidateMatch {
  resumeId: string; // ID of the candidate's resume
  score: number; // match score between 0 and 1
  explanation: string; // brief explanation of the match
}
