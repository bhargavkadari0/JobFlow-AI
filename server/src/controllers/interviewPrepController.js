import mongoose from "mongoose";

import JobApplication from "../models/JobApplication.js";
import InterviewAttempt from "../models/InterviewAttempt.js";

import {
  generateInterviewContent,
  evaluateInterviewResponse,
} from "../services/geminiService.js";

// =====================================================
// FEATURE 1: GENERATE INTERVIEW PREPARATION KIT
// Supports Beginner, Intermediate, Advanced
// =====================================================

export const generateInterviewKit = async (req, res) => {
  try {
    const { jobId, difficulty = "Intermediate" } = req.body;

    // Validate job selection.
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Please select a job application.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job application ID.",
      });
    }

    // Validate difficulty.
    const allowedDifficulties = [
      "Beginner",
      "Intermediate",
      "Advanced",
    ];

    if (!allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid difficulty level. Choose Beginner, Intermediate, or Advanced.",
      });
    }

    // Validate authentication.
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in again.",
      });
    }

    // Find the selected job belonging to the logged-in user.
    const application = await JobApplication.findOne({
      _id: jobId,
      userId: req.user.id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message:
          "Job application not found for your account. Please select the application again.",
      });
    }

    // Generate questions for the selected difficulty.
    const interviewKit = await generateInterviewContent({
      company: application.company,
      jobTitle: application.jobTitle,
      jobDescription: application.jobDescription || "",
      aiAnalysis: application.aiAnalysis || {},
      difficulty,
    });

    // Validate the AI response.
    if (!interviewKit || typeof interviewKit !== "object") {
      throw new Error(
        "The AI returned an invalid interview preparation response."
      );
    }

    // Ensure the selected difficulty is displayed consistently.
    const normalizedKit = {
      ...interviewKit,
      company: application.company,
      jobTitle: application.jobTitle,
      difficulty,

      technicalQuestions: Array.isArray(
        interviewKit.technicalQuestions
      )
        ? interviewKit.technicalQuestions.map((item) => ({
            ...item,
            difficulty,
          }))
        : [],

      hrQuestions: Array.isArray(interviewKit.hrQuestions)
        ? interviewKit.hrQuestions.map((item) => ({
            ...item,
            difficulty,
          }))
        : [],

      projectQuestions: Array.isArray(
        interviewKit.projectQuestions
      )
        ? interviewKit.projectQuestions.map((item) => ({
            ...item,
            difficulty,
          }))
        : [],
    };

    return res.status(200).json({
      success: true,
      message: "Interview preparation generated successfully.",
      data: normalizedKit,
    });
  } catch (error) {
    console.error("Interview preparation error:", error);

    const status =
      error.status === 429
        ? 429
        : error.status === 503
          ? 503
          : 500;

    let message =
      error.message ||
      "Failed to generate interview preparation. Please try again.";

    if (error.code === "GEMINI_QUOTA_EXCEEDED") {
      message =
        "Gemini API free-tier quota exceeded. Please wait until your quota resets or check your API plan and billing.";
    } else if (status === 503) {
      message =
        "Gemini AI is temporarily unavailable. Please try again later.";
    }

    return res.status(status).json({
      success: false,
      message,
      code: error.code || undefined,
    });
  }
};

// =====================================================
// FEATURE 2: EVALUATE AND SAVE MOCK INTERVIEW ANSWER
// =====================================================

export const evaluateInterviewAnswer = async (req, res) => {
  try {
    const {
      jobId,
      question,
      answer,
      category = "Technical",
    } = req.body;

    // Validate required fields.
    if (
      !jobId ||
      typeof question !== "string" ||
      !question.trim() ||
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Job, question, and answer are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job application ID.",
      });
    }

    if (answer.trim().length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Please keep your answer under 10,000 characters.",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in again.",
      });
    }

    const allowedCategories = [
      "Technical",
      "HR",
      "Project",
    ];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview question category.",
      });
    }

    // Verify that the job belongs to the authenticated user.
    const application = await JobApplication.findOne({
      _id: jobId,
      userId: req.user.id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message:
          "Job application not found for your account. Please select the application again.",
      });
    }

    // Evaluate the answer using Gemini.
    const feedback = await evaluateInterviewResponse({
      company: application.company,
      jobTitle: application.jobTitle,
      question: question.trim(),
      answer: answer.trim(),
      category,
      jobDescription: application.jobDescription || "",
    });

    const parsedScore = Number(feedback.score);

    const score = Number.isFinite(parsedScore)
      ? Math.max(0, Math.min(100, parsedScore))
      : 0;

    // Save the evaluated answer.
    const savedAttempt = await InterviewAttempt.create({
      userId: req.user.id,
      jobApplicationId: application._id,
      company: application.company,
      jobTitle: application.jobTitle,
      category,
      question: question.trim(),
      answer: answer.trim(),
      score,
      overallFeedback: feedback.overallFeedback || "",
      strengths: Array.isArray(feedback.strengths)
        ? feedback.strengths
        : [],
      improvements: Array.isArray(feedback.improvements)
        ? feedback.improvements
        : [],
      sampleAnswer: feedback.sampleAnswer || "",
      nextTip: feedback.nextTip || "",
    });

    return res.status(200).json({
      success: true,
      message: "Interview answer evaluated and saved successfully.",
      data: {
        ...feedback,
        score,
      },
      historyId: savedAttempt._id,
      savedAt: savedAttempt.createdAt,
    });
  } catch (error) {
    console.error("Interview answer evaluation error:", error);

    const status =
      error.status === 429
        ? 429
        : error.status === 503
          ? 503
          : 500;

    let message =
      error.message ||
      "Failed to evaluate your interview answer. Please try again.";

    if (error.code === "GEMINI_QUOTA_EXCEEDED") {
      message =
        "Gemini API free-tier quota exceeded. Please wait until your quota resets or check your API plan and billing.";
    } else if (status === 503) {
      message =
        "Gemini AI is temporarily unavailable. Please try again later.";
    }

    return res.status(status).json({
      success: false,
      message,
      code: error.code || undefined,
    });
  }
};