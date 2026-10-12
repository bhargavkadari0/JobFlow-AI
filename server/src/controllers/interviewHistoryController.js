import mongoose from "mongoose";

import InterviewAttempt from "../models/InterviewAttempt.js";
import JobApplication from "../models/JobApplication.js";

// =====================================================
// GET INTERVIEW HISTORY
// Optional query parameter: ?jobId=APPLICATION_ID
// =====================================================

export const getInterviewHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { jobId } = req.query;

    const filter = {
      userId,
    };

    if (jobId) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job application ID.",
        });
      }

      const application = await JobApplication.findOne({
        _id: jobId,
        userId,
      }).select("_id");

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Job application not found.",
        });
      }

      filter.jobApplicationId = application._id;
    }

    const history = await InterviewAttempt.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Interview history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve interview history.",
    });
  }
};

// =====================================================
// GET INTERVIEW PERFORMANCE ANALYTICS
// =====================================================

export const getInterviewAnalytics = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { jobId } = req.query;

    const filter = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (jobId) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job application ID.",
        });
      }

      const application = await JobApplication.findOne({
        _id: jobId,
        userId,
      }).select("_id");

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Job application not found.",
        });
      }

      filter.jobApplicationId = application._id;
    }

    const summaryResult = await InterviewAttempt.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,

          totalAttempts: {
            $sum: 1,
          },

          averageScore: {
            $avg: "$score",
          },

          highestScore: {
            $max: "$score",
          },

          lowestScore: {
            $min: "$score",
          },
        },
      },
    ]);

    const categoryResults = await InterviewAttempt.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$category",

          attempts: {
            $sum: 1,
          },

          averageScore: {
            $avg: "$score",
          },

          highestScore: {
            $max: "$score",
          },
        },
      },
      {
        $sort: {
          averageScore: -1,
        },
      },
    ]);

    const recentAttempts = await InterviewAttempt.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "company jobTitle category question score createdAt"
      )
      .lean();

    const improvementResults = await InterviewAttempt.aggregate([
      {
        $match: filter,
      },
      {
        $unwind: "$improvements",
      },
      {
        $group: {
          _id: "$improvements",

          occurrences: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          occurrences: -1,
          _id: 1,
        },
      },
      {
        $limit: 5,
      },
    ]);

    const summary = summaryResult[0] || {
      totalAttempts: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
    };

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          totalAttempts: summary.totalAttempts,
          averageScore: Math.round(
            summary.averageScore || 0
          ),
          highestScore: summary.highestScore || 0,
          lowestScore: summary.lowestScore || 0,
        },

        categoryPerformance: categoryResults.map(
          (item) => ({
            category: item._id,
            attempts: item.attempts,
            averageScore: Math.round(
              item.averageScore || 0
            ),
            highestScore: item.highestScore || 0,
          })
        ),

        recentAttempts,

        improvementAreas: improvementResults.map(
          (item) => ({
            area: item._id,
            occurrences: item.occurrences,
          })
        ),
      },
    });
  } catch (error) {
    console.error("Interview analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve interview analytics.",
    });
  }
};