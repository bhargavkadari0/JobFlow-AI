import { z } from "zod";

export const jobAnalysisSchema = z.object({
  summary: z.string(),

  requiredSkills: z.array(z.string()),

  responsibilities: z.array(z.string()),

  keywords: z.array(z.string()),

  missingSkills: z.array(z.string()),

  matchNotes: z.array(z.string()),
});