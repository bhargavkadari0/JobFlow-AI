import JobApplication from "../models/JobApplication.js";

/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

export async function getDashboardStats(req, res) {
  try {
    const userId = req.user.id;

    const totalApplications = await JobApplication.countDocuments({
      userId,
    });

    const wishlist = await JobApplication.countDocuments({
      userId,
      status: "Wishlist",
    });

    const applied = await JobApplication.countDocuments({
      userId,
      status: "Applied",
    });

    const assessment = await JobApplication.countDocuments({
      userId,
      status: "Assessment",
    });

    const interview = await JobApplication.countDocuments({
      userId,
      status: "Interview",
    });

    const selected = await JobApplication.countDocuments({
      userId,
      status: "Selected",
    });

    const rejected = await JobApplication.countDocuments({
      userId,
      status: "Rejected",
    });

    return res.status(200).json({
      success: true,
      data: {
        totalApplications,
        wishlist,
        applied,
        assessment,
        interview,
        selected,
        rejected,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while getting dashboard statistics",
    });
  }
}

/* =========================================================
   DASHBOARD AI INSIGHTS
========================================================= */

export async function getDashboardInsights(req, res) {
  try {
    const userId = req.user.id;

    const applications = await JobApplication.find(
      { userId },
      {
        "aiAnalysis.requiredSkills": 1,
        "aiAnalysis.missingSkills": 1,
      }
    ).lean();

    const requiredSkillCounts = {};
    const missingSkillCounts = {};

    for (const application of applications) {
      const requiredSkills =
        application.aiAnalysis?.requiredSkills || [];

      const missingSkills =
        application.aiAnalysis?.missingSkills || [];

      for (const skill of requiredSkills) {
        const normalizedSkill = skill.trim();

        if (!normalizedSkill) continue;

        const key = normalizedSkill.toLowerCase();

        if (!requiredSkillCounts[key]) {
          requiredSkillCounts[key] = {
            skill: normalizedSkill,
            count: 0,
          };
        }

        requiredSkillCounts[key].count += 1;
      }

      for (const skill of missingSkills) {
        const normalizedSkill = skill.trim();

        if (!normalizedSkill) continue;

        const key = normalizedSkill.toLowerCase();

        if (!missingSkillCounts[key]) {
          missingSkillCounts[key] = {
            skill: normalizedSkill,
            count: 0,
          };
        }

        missingSkillCounts[key].count += 1;
      }
    }

    const topRequiredSkills = Object.values(requiredSkillCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topMissingSkills = Object.values(missingSkillCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return res.status(200).json({
      success: true,
      data: {
        analyzedApplications: applications.filter(
          (application) =>
            application.aiAnalysis?.requiredSkills?.length ||
            application.aiAnalysis?.missingSkills?.length
        ).length,

        topRequiredSkills,
        topMissingSkills,
      },
    });
  } catch (error) {
    console.error("Dashboard insights error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while getting dashboard AI insights",
    });
  }
}

/* =========================================================
   DASHBOARD ANALYTICS
========================================================= */

export async function getDashboardAnalytics(req, res) {
  try {
    const userId = req.user.id;

    const applications = await JobApplication.find(
      { userId },
      {
        status: 1,
        appliedDate: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: 1 })
      .lean();

    const statusOrder = [
      "Wishlist",
      "Applied",
      "Assessment",
      "Interview",
      "Selected",
      "Rejected",
    ];

    const statusCounts = statusOrder.map((status) => ({
      status,
      count: applications.filter(
        (application) => application.status === status
      ).length,
    }));

    const totalApplications = applications.length;

    const selected = applications.filter(
      (application) => application.status === "Selected"
    ).length;

    const rejected = applications.filter(
      (application) => application.status === "Rejected"
    ).length;

    const activeApplications =
      totalApplications - selected - rejected;

    const selectionRate =
      totalApplications > 0
        ? Math.round((selected / totalApplications) * 100)
        : 0;

    const rejectionRate =
      totalApplications > 0
        ? Math.round((rejected / totalApplications) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalApplications,
        selected,
        rejected,
        activeApplications,
        selectionRate,
        rejectionRate,
        statusCounts,
      },
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while getting dashboard analytics",
    });
  }
}

/* =========================================================
   MONTHLY APPLICATION TREND
   Last 6 months, including the current month
========================================================= */

export async function getMonthlyApplicationTrend(req, res) {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Generate the last six calendar months.
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: date.toLocaleString("en-US", {
          month: "short",
        }),
        applications: 0,
      });
    }

    // Start of the first month in the six-month period.
    const startDate = new Date(
      months[0].year,
      months[0].month,
      1
    );

    // Retrieve only this user's applications.
    const applications = await JobApplication.find({
      userId,
      appliedDate: {
        $gte: startDate,
        $lte: now,
      },
    })
      .select("appliedDate")
      .lean();

    // Count applications for each month.
    for (const application of applications) {
      if (!application.appliedDate) continue;

      const appliedDate = new Date(application.appliedDate);

      const matchingMonth = months.find(
        (month) =>
          month.year === appliedDate.getFullYear() &&
          month.month === appliedDate.getMonth()
      );

      if (matchingMonth) {
        matchingMonth.applications += 1;
      }
    }

    return res.status(200).json({
      success: true,
      data: months.map(({ label, applications }) => ({
        month: label,
        applications,
      })),
    });
  } catch (error) {
    console.error("Monthly application trend error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch monthly application trend",
    });
  }
}