import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./AddJob.css";

function AddJob() {
  const navigate = useNavigate();

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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await api.post("/jobs", formData);

      setMessage(response.data.message);

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to create job application."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="add-job-page">
      <div className="add-job-grid"></div>
      <div className="add-job-glow"></div>

      <div className="add-job-shell">
        {/* HEADER */}
        <header className="add-job-header">
          <div>
            <div className="add-job-kicker">
              <span className="add-job-kicker-dot"></span>
              JOBFLOW AI / NEW APPLICATION
            </div>

            <h1>
              Capture the
              <span> opportunity.</span>
            </h1>

            <p>
              Add a job to your workspace and keep every important
              detail in one place.
            </p>
          </div>

          <button
            type="button"
            className="back-dashboard-btn"
            onClick={() => navigate("/dashboard")}
          >
            <span>←</span>
            Dashboard
          </button>
        </header>

        {/* FORM */}
        <form className="add-job-form" onSubmit={handleSubmit}>
          <section className="form-panel">
            <div className="form-panel-heading">
              <div>
                <span className="form-section-number">01</span>
                <div>
                  <p className="form-section-label">CORE DETAILS</p>
                  <h2>Opportunity information</h2>
                </div>
              </div>

              <span className="required-note">
                * Required
              </span>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="company">
                  Company <span>*</span>
                </label>

                <input
                  id="company"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="e.g. Google"
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="jobTitle">
                  Job Title <span>*</span>
                </label>

                <input
                  id="jobTitle"
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Frontend Developer"
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="location">Location</label>

                <input
                  id="location"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Hyderabad"
                />
              </div>

              <div className="field-group">
                <label htmlFor="salary">Salary</label>

                <input
                  id="salary"
                  type="text"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  placeholder="e.g. 6-8 LPA"
                />
              </div>

              <div className="field-group field-full">
                <label htmlFor="jobUrl">Job URL</label>

                <input
                  id="jobUrl"
                  type="url"
                  name="jobUrl"
                  value={formData.jobUrl}
                  onChange={handleChange}
                  placeholder="https://company.com/careers/job"
                />
              </div>
            </div>
          </section>

          {/* STATUS */}
          <section className="form-panel">
            <div className="form-panel-heading">
              <div>
                <span className="form-section-number">02</span>
                <div>
                  <p className="form-section-label">WORKFLOW</p>
                  <h2>Application status</h2>
                </div>
              </div>
            </div>

            <div className="status-selector">
              <div className="field-group">
                <label htmlFor="status">Current Status</label>

                <select
                  id="status"
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

              <div className="status-preview">
                <span className="status-preview-label">
                  CURRENT STAGE
                </span>

                <strong>{formData.status}</strong>

                <span
                  className={`status-preview-dot status-${formData.status.toLowerCase()}`}
                ></span>
              </div>
            </div>
          </section>

          {/* DATES */}
          <section className="form-panel">
            <div className="form-panel-heading">
              <div>
                <span className="form-section-number">03</span>
                <div>
                  <p className="form-section-label">TIMELINE</p>
                  <h2>Important dates</h2>
                </div>
              </div>
            </div>

            <div className="form-grid two-column">
              <div className="field-group">
                <label htmlFor="appliedDate">
                  Applied Date
                </label>

                <input
                  id="appliedDate"
                  type="date"
                  name="appliedDate"
                  value={formData.appliedDate}
                  onChange={handleChange}
                />
              </div>

              <div className="field-group">
                <label htmlFor="followUpDate">
                  Follow-up Date
                </label>

                <input
                  id="followUpDate"
                  type="date"
                  name="followUpDate"
                  value={formData.followUpDate}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          {/* JOB DESCRIPTION */}
          <section className="form-panel description-panel">
            <div className="form-panel-heading">
              <div>
                <span className="form-section-number">04</span>
                <div>
                  <p className="form-section-label">AI INPUT</p>
                  <h2>Job description</h2>
                </div>
              </div>

              <span className="ai-badge">
                AI READY
              </span>
            </div>

            <div className="field-group">
              <label htmlFor="jobDescription">
                Job Description
              </label>

              <textarea
                id="jobDescription"
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleChange}
                placeholder="Paste the complete job description here. JobFlow AI can analyze the requirements later..."
                rows="11"
              />

              <div className="textarea-footer">
                <span>
                  Include responsibilities, requirements and
                  preferred skills for better AI analysis.
                </span>

                <span>
                  {formData.jobDescription.length} characters
                </span>
              </div>
            </div>
          </section>

          {/* FORM FOOTER */}
          <div className="add-job-footer">
            <div className="form-message-area">
              {message && (
                <div className="form-success">
                  <span>✓</span>
                  {message}
                </div>
              )}

              {error && (
                <div className="form-error">
                  <span>!</span>
                  {error}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-job-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="button-loader"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    Add Application
                    <span>↗</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

export default AddJob;