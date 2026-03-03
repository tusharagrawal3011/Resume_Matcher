import { z } from "zod";

const resumeMetadataSchema = z.object({
  yearsOfExperience: z.number().min(0).optional(),
  skills: z.array(z.string().min(1)).optional(),
  location: z.string().min(1).optional(),
  roleType: z.string().min(1).optional()
});

const ingestionResumeSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).optional(),
  pdfBase64: z.string().min(1).optional(),
  metadata: resumeMetadataSchema.optional()
}).refine(
  data => Boolean(data.content) || Boolean(data.pdfBase64),
  { message: "Each resume must include either content or pdfBase64." }
);

const resumeSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  metadata: resumeMetadataSchema.optional()
});

const jobSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  requirements: z.object({
    minExperience: z.number().min(0).optional(),
    mustHaveSkills: z.array(z.string().min(1)).optional(),
    location: z.string().min(1).optional()
  }).optional()
});

export const ingestResumesSchema = z.object({
  resumes: z.array(ingestionResumeSchema).min(1)
});

export const matchResumesSchema = z.object({
  job: jobSchema,
  resumes: z.array(resumeSchema).optional(),
  topK: z.number().int().positive().max(100).optional()
});
