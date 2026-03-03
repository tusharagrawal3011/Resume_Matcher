export interface JobDescription {
  id: string; // Job description ID
  content: string; // cleaned text of the job description
  requirements?: {
    // optional requirements
    minExperience?: number; // in years
    mustHaveSkills?: string[]; // list of required skills
    location?: string; // job location
  };
}
