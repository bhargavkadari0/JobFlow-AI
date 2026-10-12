import express from "express";

import {
  getDashboardStats,
  getDashboardInsights,
  getDashboardAnalytics,
  getMonthlyApplicationTrend,
} from "../controllers/dashboardController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Dashboard statistics
router.get("/stats", authMiddleware, getDashboardStats);

// AI-powered skill insights
router.get("/insights", authMiddleware, getDashboardInsights);

// Application status analytics
router.get("/analytics", authMiddleware, getDashboardAnalytics);

// Monthly application trend - last 6 months
router.get(
  "/monthly-trend",
  authMiddleware,
  getMonthlyApplicationTrend
);

export default router;