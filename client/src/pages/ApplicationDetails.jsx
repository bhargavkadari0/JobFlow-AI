import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./ApplicationDetails.css";

function ApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const [interviewNotes, setInterviewNotes] = useState("");
  const [interviewDate, setInterviewDate] = useState("");

  const [formData, setFormData] = useState({
    company: "",
    jobTitle: "",
    location: "",
    jobUrl: "",
    salary: "",
    status: "Wishlist",
    appliedDate: "",
    followUpDate: "",
    jobDescription: "",
  });

  // ==============================
  // GET APPLICATION
  // ==============================

  async function fetchJob() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/jobs/${id}`);
      const jobData = response.data.data;

      setJob(jobData);

      // Load existing AI analysis from MongoDB
      if (jobData.aiAnalysis && jobData.aiAnalysis.summary) {
        setAiAnalysis(jobData.aiAnalysis);
      } else {
        setAiAnalysis(null);
      }

      setFormData({
        company: jobData.company || "",
        jobTitle: jobData.jobTitle || "",
        location: jobData.location || "",
        jobUrl: jobData.jobUrl || "",
        salary: jobData.salary || "",
        status: jobData.status || "Wishlist",
        appliedDate: jobData.appliedDate
          ? jobData.appliedDate.split("T")[0]
          : "",
        followUpDate: jobData.followUpDate
          ? jobData.followUpDate.split("T")[0]
          : "",
        jobDescription: jobData.jobDescription || "",
      });
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to load application."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJob();
  }, [id]);

  // Build a timeline from the application data already saved in MongoDB.
  // This is a factual milestone timeline; it does not invent historical status changes.
  function getTimelineEvents() {
    if (!job) return [];

    const events = [];
    const addEvent = (key, title, date, description, type = "milestone") => {
      if (!date) return;
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) return;
      events.push({ key, title, date: parsedDate, description, type });
    };

    addEvent(
      "created",
      "Application added to JobFlow",
      job.createdAt,
      `You started tracking ${job.jobTitle || "this role"} at ${job.company || "this company"}.`,
      "created"
    );

    addEvent(
      "applied",
      "Application date",
      job.appliedDate,
      "The application date saved in your application record.",
      "applied"
    );

    if (job.status) {
      events.push({
        key: "current-status",
        title: `Current status: ${job.status}`,
        date: new Date(job.updatedAt || job.createdAt || job.appliedDate || Date.now()),
        description: "Current saved status. Earlier status changes are not recorded yet.",
        type: "status",
      });
    }

    addEvent(
      "follow-up",
      "Follow-up scheduled",
      job.followUpDate,
      "A follow-up date is saved for this application.",
      "follow-up"
    );

    (Array.isArray(job.interviewNotes) ? job.interviewNotes : []).forEach((note, index) => {
      addEvent(
        `interview-${note._id || index}`,
        "Interview note added",
        note.date || note.createdAt,
        note.notes || "Interview note saved.",
        "interview"
      );
    });

    if (job.aiAnalysis?.summary) {
      addEvent(
        "ai-analysis",
        "AI job analysis available",
        job.updatedAt || job.createdAt,
        "Gemini AI analysis is saved with this application.",
        "ai"
      );
    }

    return events.sort((a, b) => b.date - a.date);
  }

  function formatTimelineDate(date) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  // ==============================
  // HANDLE FORM INPUT
  // ==============================

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  // ==============================
  // AI ANALYSIS
  // ==============================

  async function handleAnalyzeAI() {
    try {
      setAnalyzingAI(true);
      setError("");
      setMessage("");

      const response = await api.post("/ai/analyze-job", {
        jobId: id,
        userSkills: [
          "JavaScript",
          "React.js",
          "HTML",
          "CSS",
          "Node.js",
          "Express.js",
          "MongoDB",
          "REST APIs",
        ],
      });

      setAiAnalysis(response.data.data);

      // Update job state with latest AI analysis
      setJob((previousJob) => ({
        ...previousJob,
        aiAnalysis: response.data.data,
      }));

      setMessage("AI analysis completed successfully.");

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to analyze job with AI."
      );
    } finally {
      setAnalyzingAI(false);
    }
  }

  // ==============================
  // UPDATE APPLICATION
  // ==============================

  async function handleUpdate(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await api.patch(`/jobs/${id}`, formData);

      setJob(response.data.data);

      setMessage("Application updated successfully.");

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to update application."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==============================
  // DELETE APPLICATION
  // ==============================

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      await api.delete(`/jobs/${id}`);

      navigate("/applications");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete application."
      );
    } finally {
      setDeleting(false);
    }
  }

  // ==============================
  // ADD INTERVIEW NOTE
  // ==============================

  async function handleAddInterviewNote(event) {
    event.preventDefault();

    if (!interviewNotes.trim()) {
      setError("Please enter interview notes.");
      return;
    }

    try {
      setAddingNote(true);
      setError("");
      setMessage("");

      const response = await api.post(`/jobs/${id}/interviews`, {
        notes: interviewNotes,
        date: interviewDate || undefined,
      });

      // Update job with latest data
      setJob(response.data.data);

      // Clear input fields
      setInterviewNotes("");
      setInterviewDate("");

      setMessage("Interview note added successfully.");

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to add interview note."
      );
    } finally {
      setAddingNote(false);
    }
  }

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <div className="application-page" data-status={formData.status}>
        <div className="application-shell">
          <div className="empty-state">Loading application...</div>
        </div>
      </div>
    );
  }

  // ==============================
  // ERROR
  // ==============================

  if (error && !job) {
    return (
      <div className="application-page">
        <div className="application-shell">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="application-page">
        <div className="application-shell">
          <div className="empty-state">Application not found.</div>
        </div>
      </div>
    );
  }

  // ==============================
  // UI
  // ==============================

  return (
    <div className="application-page">
      <div className="application-shell">

        {/* BACK */}
        <Link to="/applications" className="back-link">
          ← Back to Applications
        </Link>

        {/* HEADER */}
        <header className="application-header">
          <div className="application-heading">
            <div className="company-orb">
              {formData.company?.charAt(0)?.toUpperCase() || "J"}
            </div>

            <div>
              <p className="ai-label">JOBFLOW APPLICATION</p>

              <h1>{formData.jobTitle || "Edit Application"}</h1>

              <p>
                {formData.company || "Company"}{" "}
                {formData.location && `• ${formData.location}`}
              </p>
            </div>
          </div>

          <span className="status-pill">
            {formData.status}
          </span>
        </header>

        {/* MESSAGES */}
        {message && (
          <div className="success-message">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠ {error}
          </div>
        )}

        {/* APPLICATION TIMELINE */}
        <section className="panel application-timeline-panel">
          <div className="panel-header timeline-heading">
            <div>
              <p className="ai-label">APPLICATION HISTORY</p>
              <h2>Application Timeline</h2>
              <p className="timeline-subtitle">
                Key milestones from the information currently saved for this role.
              </p>
            </div>
            <span className="timeline-count">
              {getTimelineEvents().length} {getTimelineEvents().length === 1 ? "event" : "events"}
            </span>
          </div>

          {getTimelineEvents().length > 0 ? (
            <div className="application-timeline">
              {getTimelineEvents().map((event) => (
                <article className={`timeline-event timeline-${event.type}`} key={event.key}>
                  <span className="timeline-marker" aria-hidden="true" />
                  <div className="timeline-event-content">
                    <div className="timeline-event-topline">
                      <h3>{event.title}</h3>
                      <time dateTime={event.date.toISOString()}>
                        {formatTimelineDate(event.date)}
                      </time>
                    </div>
                    <p>{event.description}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No timeline milestones yet. Add an application date or interview note to start building the timeline.
            </div>
          )}
        </section>

        {/* MAIN GRID */}
        <div className="application-grid">

          <div className="application-left-column">

          {/* APPLICATION EDIT */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="ai-label">APPLICATION</p>
                <h2>Edit Application</h2>
              </div>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="form-grid">

                <div className="field">
                  <label>Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label>Job Title</label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Hyderabad"
                  />
                </div>

                <div className="field">
                  <label>Salary</label>
                  <input
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="6 LPA"
                  />
                </div>

                <div className="field full">
                  <label>Job URL</label>
                  <input
                    type="url"
                    name="jobUrl"
                    value={formData.jobUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>

                <div className="field">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="Wishlist">Wishlist</option>
                    <option value="Applied">Applied</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Interview">Interview</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="field">
                  <label>Applied Date</label>
                  <input
                    type="date"
                    name="appliedDate"
                    value={formData.appliedDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label>Follow-up Date</label>
                  <input
                    type="date"
                    name="followUpDate"
                    value={formData.followUpDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="field full">
                  <label>Job Description</label>
                  <textarea
                    name="jobDescription"
                    value={formData.jobDescription}
                    onChange={handleChange}
                    rows="10"
                    placeholder="Paste the complete job description here..."
                  />
                </div>
              </div>

              <div className="action-row">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving || deleting || analyzingAI}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  className="danger-button"
                  onClick={handleDelete}
                  disabled={saving || deleting || analyzingAI}
                >
                  {deleting ? "Deleting..." : "Delete Application"}
                </button>
              </div>
            </form>
          </section>

          

          </div>

          {/* AI ANALYSIS */}
          <section className="panel ai-panel">
            <div className="ai-live">
              <span className="ai-live-dot"></span>
              AI POWERED
            </div>

            <p className="ai-label">JOBFLOW INTELLIGENCE</p>

            <h2>🤖 AI Job Analysis</h2>

            <p className="ai-empty">
              Analyze this job description using Gemini AI and
              compare it with your current skills.
            </p>

            <button
              type="button"
              className="ai-button"
              onClick={handleAnalyzeAI}
              disabled={analyzingAI || saving || deleting}
            >
              {analyzingAI
                ? "⟳ Analyzing with AI..."
                : "✦ Analyze with AI"}
            </button>

            {aiAnalysis && (
              <div className="ai-result">

                <div className="ai-summary">
                  <span className="ai-label">AI SUMMARY</span>
                  <p>{aiAnalysis.summary}</p>
                </div>

                <div className="ai-section">
                  <h3 className="ai-section-title">
                    Required Skills
                  </h3>

                  {aiAnalysis.requiredSkills?.length > 0 ? (
                    <div className="chip-list">
                      {aiAnalysis.requiredSkills.map(
                        (skill, index) => (
                          <span
                            className="skill-chip"
                            key={index}
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="ai-empty">
                      No specific skills found.
                    </p>
                  )}
                </div>

                <div className="ai-section">
                  <h3 className="ai-section-title">
                    Responsibilities
                  </h3>

                  {aiAnalysis.responsibilities?.length > 0 ? (
                    <ul className="ai-list">
                      {aiAnalysis.responsibilities.map(
                        (responsibility, index) => (
                          <li key={index}>
                            {responsibility}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="ai-empty">
                      No responsibilities found.
                    </p>
                  )}
                </div>

                <div className="ai-section">
                  <h3 className="ai-section-title">
                    Keywords
                  </h3>

                  {aiAnalysis.keywords?.length > 0 ? (
                    <div className="chip-list">
                      {aiAnalysis.keywords.map(
                        (keyword, index) => (
                          <span
                            className="skill-chip"
                            key={index}
                          >
                            {keyword}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="ai-empty">
                      No keywords found.
                    </p>
                  )}
                </div>

                <div className="ai-section">
                  <h3 className="ai-section-title">
                    Missing Skills
                  </h3>

                  {aiAnalysis.missingSkills?.length > 0 ? (
                    <div className="chip-list">
                      {aiAnalysis.missingSkills.map(
                        (skill, index) => (
                          <span
                            className="missing-chip"
                            key={index}
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="ai-empty">
                      🎉 No missing skills detected.
                    </p>
                  )}
                </div>

                <div className="ai-section">
                  <h3 className="ai-section-title">
                    Match Notes
                  </h3>

                  {aiAnalysis.matchNotes?.length > 0 ? (
                    <ul className="ai-list">
                      {aiAnalysis.matchNotes.map(
                        (note, index) => (
                          <li
                            className="match-note"
                            key={index}
                          >
                            {note}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="ai-empty">
                      No match notes available.
                    </p>
                  )}
                </div>

              </div>
            )}
          </section>

        </div>


        {/* INTERVIEW NOTES — separate, calm workspace below the main details */}
        <section className="panel interview-notes-panel">
          <div className="panel-header interview-notes-heading">
            <div>
              <p className="ai-label">INTERVIEW TRACKER</p>
              <h2>Interview Notes</h2>
              <p className="notes-subtitle">Keep interview dates, questions, and feedback in one place.</p>
            </div>
            <span className="notes-count">{job.interviewNotes?.length || 0} {(job.interviewNotes?.length || 0) === 1 ? "note" : "notes"}</span>
          </div>

          <div className="interview-notes-layout">
            <div className="saved-notes-column">
              {job.interviewNotes && job.interviewNotes.length > 0 ? (
                <div className="saved-notes-list">
                  {job.interviewNotes.map((note) => (
                    <article className="note-card" key={note._id}>
                      <div className="note-card-topline">
                        <span className="note-date">
                          {note.date ? new Date(note.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Date not set"}
                        </span>
                        <span className="note-index">INTERVIEW NOTE</span>
                      </div>
                      <p className="note-text">{note.notes}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="notes-empty-state">
                  <span className="notes-empty-icon" aria-hidden="true">✎</span>
                  <h3>No interview notes yet</h3>
                  <p>Add your first note after an interview to remember questions, answers, and feedback.</p>
                </div>
              )}
            </div>

            <div className="add-note-card">
              <div className="add-note-heading">
                <span className="add-note-symbol" aria-hidden="true">+</span>
                <div>
                  <h3>Add a note</h3>
                  <p>Record the important details while they are fresh.</p>
                </div>
              </div>
              <form onSubmit={handleAddInterviewNote}>
                <div className="field">
                  <label>Interview date</label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(event) => setInterviewDate(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Notes and feedback</label>
                  <textarea
                    value={interviewNotes}
                    onChange={(event) => setInterviewNotes(event.target.value)}
                    placeholder="Questions asked, your answers, feedback, or next steps..."
                    rows="5"
                  />
                </div>
                <button type="submit" className="primary-button add-note-button" disabled={addingNote}>
                  {addingNote ? "Saving note..." : "Save interview note  →"}
                </button>
              </form>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default ApplicationDetails;
