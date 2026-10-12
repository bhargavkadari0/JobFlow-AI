import JobApplication from "../models/JobApplication.js";
import { analyzeJobDescription } from "../services/geminiService.js";
import { jobAnalysisSchema } from "../validators/aiValidator.js";

export async function analyzeJob(req, res) {
  try {
    const { jobId, userSkills = [] } = req.body;

    // 1. Check jobId
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "jobId is required.",
      });
    }

    // 2. Check userSkills
    if (!Array.isArray(userSkills)) {
      return res.status(400).json({
        success: false,
        message: "userSkills must be an array.",
      });
    }

    // 3. Find the job belonging to the logged-in user
    const job = await JobApplication.findOne({
      _id: jobId,
      userId: req.user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job application not found.",
      });
    }

    // 4. Check whether the job has a description
    if (!job.jobDescription || !job.jobDescription.trim()) {
      return res.status(400).json({
        success: false,
        message: "Job description is required for AI analysis.",
      });
    }

    // 5. Send job description to Gemini
    const aiResult = await analyzeJobDescription(
      job.jobDescription,
      userSkills
    );

    // 6. Validate Gemini's response using Zod
    const validatedResult = jobAnalysisSchema.safeParse(aiResult);

    if (!validatedResult.success) {
      console.error(
        "Invalid Gemini response:",
        validatedResult.error
      );

      return res.status(500).json({
        success: false,
        message: "Gemini returned an invalid response format.",
      });
    }

    // 7. Save AI analysis to this job application
    job.aiAnalysis = validatedResult.data;

    await job.save();

    // 8. Return saved AI analysis
    return res.status(200).json({
      success: true,
      data: job.aiAnalysis,
    });
  } catch (error) {
  console.error("AI analysis error:", error);

  return res.status(500).json({
    success: false,
    message: "Failed to analyze job description.",
  });
}
}