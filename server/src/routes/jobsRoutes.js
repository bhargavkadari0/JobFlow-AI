import express from "express";
import {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  addInterviewNote,
  getFollowUpJobs,
} from "../controllers/jobsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createJob);

router.get("/", authMiddleware, getJobs);

router.get("/follow-ups", authMiddleware, getFollowUpJobs);

router.get("/:id", authMiddleware, getJobById);

router.patch("/:id", authMiddleware, updateJob);

router.delete("/:id", authMiddleware, deleteJob);

router.post("/:id/interviews", authMiddleware, addInterviewNote);

export default router;