import JobApplication from "../models/JobApplication.js";

export async function getFollowUpJobs(req, res) {
  try {
    const jobs = await JobApplication.find({
      userId: req.user.id,
      followUpDate: {
        $ne: null,
      },
    }).sort({
      followUpDate: 1,
    });

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error("Get follow-up jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching follow-up applications",
    });
  }
}


export async function addInterviewNote(req, res) {
  try {
    const { notes, date } = req.body;

    if (!notes) {
      return res.status(400).json({
        success: false,
        message: "Interview notes are required",
      });
    }

    const job = await JobApplication.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job application not found",
      });
    }

    job.interviewNotes.push({
      notes,
      date: date || new Date(),
    });

    await job.save();

    return res.status(201).json({
      success: true,
      message: "Interview note added successfully",
      data: job,
    });
  } catch (error) {
    console.error("Add interview note error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while adding interview note",
    });
  }
}


export async function deleteJob(req, res) {
  try {
    const job = await JobApplication.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job application deleted successfully",
    });
  } catch (error) {
    console.error("Delete job error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting job application",
    });
  }
}



export async function updateJob(req, res) {
  try {
    const {
      company,
      jobTitle,
      location,
      jobUrl,
      salary,
      status,
      appliedDate,
      followUpDate,
      jobDescription,
    } = req.body;

    const job = await JobApplication.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job application not found",
      });
    }

    if (company !== undefined) job.company = company;
    if (jobTitle !== undefined) job.jobTitle = jobTitle;
    if (location !== undefined) job.location = location;
    if (jobUrl !== undefined) job.jobUrl = jobUrl;
    if (salary !== undefined) job.salary = salary;
    if (status !== undefined) job.status = status;
    if (appliedDate !== undefined) job.appliedDate = appliedDate;
    if (followUpDate !== undefined) job.followUpDate = followUpDate;
    if (jobDescription !== undefined) {
      job.jobDescription = jobDescription;
    }

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Job application updated successfully",
      data: job,
    });
  } catch (error) {
    console.error("Update job error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating job application",
    });
  }
}


export async function getJobById(req, res) {
  try {
    const job = await JobApplication.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job application not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Get job by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching job application",
    });
  }
}

export async function getJobs(req, res) {
  try {
    const { search, status, location } = req.query;

    const filter = {
      userId: req.user.id,
    };

    // Search by company or job title
    if (search) {
      filter.$or = [
        {
          company: {
            $regex: search,
            $options: "i",
          },
        },
        {
          jobTitle: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by location
    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    const jobs = await JobApplication.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error("Get jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching job applications",
    });
  }
}
   



export async function createJob(req, res) {
  try {
    const {
      company,
      jobTitle,
      location,
      jobUrl,
      salary,
      status,
      appliedDate,
      followUpDate,
      jobDescription,
    } = req.body;

    if (!company || !jobTitle) {
      return res.status(400).json({
        success: false,
        message: "Company and job title are required",
      });
    }

    const job = await JobApplication.create({
      userId: req.user.id,
      company,
      jobTitle,
      location,
      jobUrl,
      salary,
      status,
      appliedDate,
      followUpDate,
      jobDescription,
    });

    return res.status(201).json({
      success: true,
      message: "Job application created successfully",
      data: job,
    });
  } catch (error) {
    console.error("Create job error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating job application",
    });
  }
}