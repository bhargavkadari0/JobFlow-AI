import express from "express";

import { analyzeJob } from "../controllers/aiController.js";

import {
  generateInterviewKit,
  evaluateInterviewAnswer,
} from "../controllers/interviewPrepController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Existing AI job analysis
router.post("/analyze-job", authMiddleware, analyzeJob);

// Generate AI interview questions and sample answers
router.post(
  "/interview-prep",
  authMiddleware,
  generateInterviewKit
);
console.log("AI routes file loaded");
// Evaluate mock interview answers
router.post(
  "/evaluate-answer",
  authMiddleware,
  evaluateInterviewAnswer
);
console.log("Evaluate answer route registered");

export default router;