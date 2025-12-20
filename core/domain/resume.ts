export interface Resume {
  id: string; // Resume ID
  content: string; // cleaned text of the resume
  metadata?: { // optional metadata
    yearsOfExperience?: number; // in years
    skills?: string[]; // list of skills
    location?: string; // candidate location
  };
}
