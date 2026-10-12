import mongoose from "mongoose";

const interviewAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    jobApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobApplication",
      required: true,
      index: true,
    },

    company: {
      type: String,
      required: true,
      trim: true,
    },

    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["Technical", "HR", "Project"],
      default: "Technical",
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    overallFeedback: {
      type: String,
      default: "",
    },

    strengths: {
      type: [String],
      default: [],
    },

    improvements: {
      type: [String],
      default: [],
    },

    sampleAnswer: {
      type: String,
      default: "",
    },

    nextTip: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Retrieve a user's history in reverse chronological order.
interviewAttemptSchema.index({
  userId: 1,
  createdAt: -1,
});

// Retrieve interview history for a particular job.
interviewAttemptSchema.index({
  userId: 1,
  jobApplicationId: 1,
  createdAt: -1,
});

export default mongoose.model(
  "InterviewAttempt",
  interviewAttemptSchema
);