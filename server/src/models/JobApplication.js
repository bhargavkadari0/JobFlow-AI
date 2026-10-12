import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

    location: {
      type: String,
      trim: true,
    },

    jobUrl: {
      type: String,
      trim: true,
    },

    salary: {
  type: String,
  trim: true,
},

status: {
  type: String,
  enum: [
    "Wishlist",
    "Applied",
    "Assessment",
    "Interview",
    "Selected",
    "Rejected",
  ],
  default: "Wishlist",
},

appliedDate: {
  type: Date,
},

followUpDate: {
  type: Date,
},

jobDescription: {
  type: String,
  trim: true,
},

aiAnalysis: {
  summary: {
    type: String,
    default: "",
  },

  requiredSkills: {
    type: [String],
    default: [],
  },

  responsibilities: {
    type: [String],
    default: [],
  },

  keywords: {
    type: [String],
    default: [],
  },

  missingSkills: {
    type: [String],
    default: [],
  },

matchNotes: { type: [String], default: [] },
},


interviewNotes: [
  {
    date: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
],

},



  {
    timestamps: true,
  }
);

export default mongoose.model(
  "JobApplication",
  jobApplicationSchema
);