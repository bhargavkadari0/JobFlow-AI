import { GoogleGenerativeAI } from "@google/generative-ai";

// =====================================================
// GEMINI API CONFIGURATION
// =====================================================

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "GEMINI_API_KEY is not configured in the server environment."
  );
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const getGeminiModel = () => {
  if (!genAI) {
    throw new Error(
      "Gemini API key is missing. Check GEMINI_API_KEY in server/.env."
    );
  }

  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

// Store the time until which Gemini requests should be blocked.
// This prevents repeated requests after a known quota failure.
let geminiQuotaBlockedUntil = 0;

// Convert Google's retry information into milliseconds.
const getRetryDelayMs = (error, message = "") => {
  const details = Array.isArray(error?.errorDetails)
    ? error.errorDetails
    : [];

  for (const detail of details) {
    if (typeof detail?.retryDelay === "string") {
      const match = detail.retryDelay.match(/^(\d+(?:\.\d+)?)s$/);

      if (match) {
        return Math.max(1000, Number(match[1]) * 1000);
      }
    }
  }

  // Example: "Please retry in 10h15m47.6s"
  const retryMatch = message.match(
    /retry in\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s)?/i
  );

  if (retryMatch) {
    const hours = Number(retryMatch[1] || 0);
    const minutes = Number(retryMatch[2] || 0);
    const seconds = Number(retryMatch[3] || 0);

    const totalMs =
      ((hours * 60 + minutes) * 60 + seconds) * 1000;

    if (totalMs > 0) {
      return totalMs;
    }
  }

  // If Google does not provide a retry duration,
  // temporarily stop repeated requests for one minute.
  return 60_000;
};

// Create a clear error for exhausted Gemini quota.
const createQuotaError = (retryAfterMs) => {
  const seconds = Math.max(
    1,
    Math.ceil(retryAfterMs / 1000)
  );

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const waitParts = [];

  if (hours) waitParts.push(`${hours}h`);
  if (minutes) waitParts.push(`${minutes}m`);

  if (remainingSeconds && !hours) {
    waitParts.push(`${remainingSeconds}s`);
  }

  const waitText = waitParts.join(" ") || "a short time";

  const error = new Error(
    "Gemini API quota is exhausted. " +
      "AI features are temporarily unavailable. " +
      `Try again in approximately ${waitText}, ` +
      "or check your Google AI Studio quota and billing."
  );

  error.status = 429;
  error.code = "GEMINI_QUOTA_EXCEEDED";
  error.retryAfterSeconds = seconds;

  return error;
};

// =====================================================
// COMMON HELPER: GENERATE AND PARSE JSON
// =====================================================

const generateJSON = async (prompt, maxRetries = 2) => {
  // Stop immediately if a previous request established
  // that the Gemini quota is exhausted.
  if (geminiQuotaBlockedUntil > Date.now()) {
    throw createQuotaError(
      geminiQuotaBlockedUntil - Date.now()
    );
  }

  const model = getGeminiModel();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);

      const responseText = result.response.text();

      if (!responseText || !responseText.trim()) {
        throw new Error("Gemini returned an empty response.");
      }

      const cleaned = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch (parseError) {
        console.error(
          "Gemini returned invalid JSON:",
          parseError.message
        );

        const jsonError = new Error(
          "Gemini returned an invalid JSON response. Please try again."
        );

        jsonError.code = "GEMINI_INVALID_JSON";

        throw jsonError;
      }
    } catch (error) {
      const status = Number(
        error.status ??
          error.statusCode ??
          error.response?.status ??
          0
      );

      const originalMessage = String(
        error.message || "Unknown Gemini API error"
      );

      const message = originalMessage.toLowerCase();

      const details = Array.isArray(error.errorDetails)
        ? error.errorDetails
        : [];

      const hasQuotaFailure = details.some((detail) =>
        String(detail?.["@type"] || "")
          .toLowerCase()
          .includes("quotafailure")
      );

      const isQuotaExceeded =
        error.code === "GEMINI_QUOTA_EXCEEDED" ||
        (
          status === 429 &&
          (
            hasQuotaFailure ||
            message.includes("quota exceeded") ||
            message.includes("exceeded your current quota") ||
            message.includes(
              "generate_content_free_tier_requests"
            ) ||
            message.includes("resource_exhausted")
          )
        );

      // Do not retry an already identified quota error.
      if (error.code === "GEMINI_QUOTA_EXCEEDED") {
        throw error;
      }

      console.error("Gemini API error details:", {
        status: status || "Unknown",
        message: originalMessage,
        code: error.code || "Not provided",
        errorDetails: error.errorDetails || null,
      });

      // Handle exhausted quota.
      if (isQuotaExceeded) {
        const retryAfterMs = getRetryDelayMs(
          error,
          originalMessage
        );

        geminiQuotaBlockedUntil =
          Date.now() + retryAfterMs;

        throw createQuotaError(retryAfterMs);
      }

      // Identify temporary errors.
      const isTemporaryError =
        [408, 429, 500, 502, 503, 504].includes(status) ||
        message.includes("high demand") ||
        message.includes("service unavailable") ||
        message.includes("temporarily unavailable") ||
        message.includes("too many requests") ||
        message.includes("rate limit") ||
        message.includes("overloaded");

      // Do not retry permanent errors.
      if (!isTemporaryError || attempt === maxRetries) {
        if (isTemporaryError) {
          const finalError = new Error(
            "Gemini AI is temporarily busy. Please wait a moment and try again."
          );

          finalError.status = status || 503;
          finalError.code =
            "GEMINI_TEMPORARILY_UNAVAILABLE";
          finalError.originalMessage = originalMessage;

          throw finalError;
        }

        throw error;
      }

      // Retry temporary failures with a short delay.
      const waitTime = 1500 * Math.pow(2, attempt);

      console.warn(
        `Gemini temporarily unavailable. Retrying in ${
          waitTime / 1000
        } seconds. Attempt ${attempt + 1}/${maxRetries}.`
      );

      await delay(waitTime);
    }
  }

  throw new Error(
    "Gemini AI could not complete the request. Please try again."
  );
};

// =====================================================
// FEATURE 1: AI JOB DESCRIPTION ANALYSIS
// =====================================================

export const analyzeJobDescription = async (
  jobDescription,
  userSkills = []
) => {
  if (
    !jobDescription ||
    typeof jobDescription !== "string" ||
    !jobDescription.trim()
  ) {
    throw new Error("Please provide a valid job description.");
  }

  if (!Array.isArray(userSkills)) {
    throw new Error("userSkills must be an array.");
  }

  const prompt = `
You are an experienced technical recruiter and career advisor.

Analyze the job description and compare it with the candidate's skills.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE SKILLS:
${JSON.stringify(userSkills)}

Requirements:
1. Summarize the job role.
2. Identify required technical and professional skills.
3. Identify the main responsibilities.
4. Extract important ATS keywords.
5. Identify skills missing from the candidate's supplied skills.
6. Give practical recommendations for improving the job application.
7. Do not invent candidate qualifications.
8. If candidate skills are empty, explain that a reliable skills-gap comparison is not possible.

Return ONLY valid JSON in this exact structure:
{
  "summary": "string",
  "requiredSkills": ["string"],
  "responsibilities": ["string"],
  "keywords": ["string"],
  "missingSkills": ["string"],
  "matchNotes": ["string"]
}
`;

  return generateJSON(prompt);
};

// =====================================================
// FEATURE 2: AI INTERVIEW PREPARATION
// =====================================================

export const generateInterviewContent = async ({
  company,
  jobTitle,
  jobDescription,
  aiAnalysis,
  difficulty = "Intermediate",
}) => {
  const prompt = `
You are an experienced technical interviewer and interview coach.

Prepare a personalized interview preparation kit for this job.

COMPANY: ${company || "Not specified"}
JOB TITLE: ${jobTitle || "Not specified"}
DIFFICULTY: ${difficulty}

JOB DESCRIPTION:
${jobDescription || "No job description provided."}

AVAILABLE JOB ANALYSIS:
${JSON.stringify(aiAnalysis || {})}

Requirements:
1. Generate exactly 5 technical questions.
2. Generate exactly 4 HR and behavioral questions.
3. Generate exactly 4 project-based questions.
4. Every question must have a useful sample answer.
5. Tailor the questions to the job title and job description.
6. Keep answers clear, realistic, and suitable for interview practice.
7. Match the requested difficulty level.
8. Do not claim these questions will definitely appear in a real interview.
9. Include a short study checklist.
10. Do not invent experience or qualifications for the candidate.

Return ONLY valid JSON in this exact structure:
{
  "company": "string",
  "jobTitle": "string",
  "difficulty": "string",
  "technicalQuestions": [
    {
      "question": "string",
      "sampleAnswer": "string",
      "topic": "string"
    }
  ],
  "hrQuestions": [
    {
      "question": "string",
      "sampleAnswer": "string",
      "topic": "string"
    }
  ],
  "projectQuestions": [
    {
      "question": "string",
      "sampleAnswer": "string",
      "topic": "string"
    }
  ],
  "studyChecklist": ["string"]
}
`;

  return generateJSON(prompt);
};

// =====================================================
// FEATURE 3: MOCK INTERVIEW ANSWER EVALUATION
// =====================================================

export const evaluateInterviewResponse = async ({
  company,
  jobTitle,
  question,
  answer,
  category = "Technical",
  jobDescription,
}) => {
  if (
    !question ||
    typeof question !== "string" ||
    !question.trim() ||
    !answer ||
    typeof answer !== "string" ||
    !answer.trim()
  ) {
    throw new Error(
      "An interview question and answer are required."
    );
  }

  if (answer.trim().length > 10000) {
    throw new Error(
      "Please keep your answer under 10,000 characters."
    );
  }

  const prompt = `
You are a fair, constructive interview coach.

Evaluate the candidate's answer to an interview practice question.

COMPANY: ${company || "Not specified"}
JOB TITLE: ${jobTitle || "Not specified"}
CATEGORY: ${category}

JOB DESCRIPTION:
${jobDescription || "Not provided."}

INTERVIEW QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Evaluation requirements:
1. Give a score from 0 to 100.
2. Explain what the candidate did well.
3. Identify specific areas to improve.
4. Provide a stronger sample answer.
5. Be supportive and constructive.
6. Do not invent experience or skills for the candidate.
7. For behavioral questions, recommend the STAR method when relevant.
8. Evaluate the actual answer rather than rewarding length alone.
9. Return a numeric score between 0 and 100.

Return ONLY valid JSON in this exact structure:
{
  "score": 0,
  "overallFeedback": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "sampleAnswer": "string",
  "nextTip": "string"
}
`;

  const feedback = await generateJSON(prompt);

  const score = Number(feedback.score);

  return {
    score: Number.isFinite(score)
      ? Math.max(0, Math.min(100, score))
      : 0,

    overallFeedback:
      typeof feedback.overallFeedback === "string"
        ? feedback.overallFeedback
        : "Review your answer and try to make it more specific.",

    strengths: Array.isArray(feedback.strengths)
      ? feedback.strengths
      : [],

    improvements: Array.isArray(feedback.improvements)
      ? feedback.improvements
      : [],

    sampleAnswer:
      typeof feedback.sampleAnswer === "string"
        ? feedback.sampleAnswer
        : "",

    nextTip:
      typeof feedback.nextTip === "string"
        ? feedback.nextTip
        : "Practice your answer and include a specific example.",
  };
};