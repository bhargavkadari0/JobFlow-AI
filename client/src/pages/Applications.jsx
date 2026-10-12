import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./Applications.css";

const STATUS_OPTIONS = ["Wishlist", "Applied", "Assessment", "Interview", "Selected", "Rejected"];

function Applications() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [draggedJobId, setDraggedJobId] = useState("");
  const [updatingJobId, setUpdatingJobId] = useState("");
  const [boardMessage, setBoardMessage] = useState("");

  async function fetchJobs(customParams) {
    try {
      setLoading(true);
      setError("");
      const params = customParams ?? {};
      if (!customParams) {
        if (search.trim()) params.search = search.trim();
        if (status) params.status = status;
        if (location.trim()) params.location = location.trim();
      }
      const response = await api.get("/jobs", { params });
      setJobs(response.data.data || []);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchJobs(); }, []);

  function handleSearch(event) {
    event.preventDefault();
    fetchJobs();
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setLocation("");
    fetchJobs({});
  }

  async function updateJobStatus(jobId, nextStatus) {
    const currentJob = jobs.find((job) => job._id === jobId);
    if (!currentJob || currentJob.status === nextStatus) return;

    const previousStatus = currentJob.status || "Wishlist";
    setUpdatingJobId(jobId);
    setBoardMessage("");
    setError("");

    // Optimistic update keeps the board responsive; revert if the API fails.
    setJobs((currentJobs) =>
      currentJobs.map((job) =>
        job._id === jobId ? { ...job, status: nextStatus } : job
      )
    );

    try {
      const response = await api.patch(`/jobs/${jobId}`, { status: nextStatus });
      const savedJob = response.data?.data;
      if (savedJob?._id) {
        setJobs((currentJobs) =>
          currentJobs.map((job) => job._id === jobId ? savedJob : job)
        );
      }
      setBoardMessage(`Status updated: ${previousStatus} → ${nextStatus}`);
      window.setTimeout(() => setBoardMessage(""), 2600);
    } catch (requestError) {
      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job._id === jobId ? { ...job, status: previousStatus } : job
        )
      );
      setError(
        requestError.response?.data?.message ||
        "Could not update the application status. Your change was reverted."
      );
    } finally {
      setUpdatingJobId("");
      setDraggedJobId("");
    }
  }

  function handleDragStart(event, job) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", job._id);
    setDraggedJobId(job._id);
  }

  function handleDragEnd() {
    setDraggedJobId("");
  }

  function handleBoardDrop(event, nextStatus) {
    event.preventDefault();
    const jobId = event.dataTransfer.getData("text/plain") || draggedJobId;
    if (jobId) updateJobStatus(jobId, nextStatus);
    setDraggedJobId("");
  }

  const jobsByStatus = useMemo(() => {
    return STATUS_OPTIONS.reduce((groups, statusName) => {
      groups[statusName] = jobs.filter(
        (job) => (job.status || "Wishlist") === statusName
      );
      return groups;
    }, {});
  }, [jobs]);

  const stats = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter((job) => !["Selected", "Rejected"].includes(job.status)).length,
    interviews: jobs.filter((job) => job.status === "Interview").length,
    selected: jobs.filter((job) => job.status === "Selected").length,
  }), [jobs]);

  function getInitials(company = "") {
    const words = company.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return company.slice(0, 2).toUpperCase() || "JF";
  }

  function statusClass(value = "Wishlist") {
    return `status-${value.toLowerCase().replace(/\s+/g, "-")}`;
  }

  function displayDate(date) {
    if (!date) return "Date not added";
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return "Date not added";
    return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  if (loading) {
    return (
      <div className="applications-page">
        <div className="applications-shell applications-loading">
          <div className="loading-orb">JF</div>
          <h2>Loading your applications</h2>
          <p>Preparing your JobFlow workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="applications-page">
      <div className="applications-shell">
        <header className="applications-topbar">
          <div>
            <span className="eyebrow">JOBFLOW AI / CAREER WORKSPACE</span>
            <h1>Applications</h1>
            <p className="page-subtitle">One focused view of every opportunity you're tracking.</p>
          </div>
          <Link to="/add-job" className="add-job-button"><span>+</span> Add Application</Link>
        </header>

        <section className="application-stats">
          <div className="stat-card"><span className="stat-label">TOTAL</span><strong>{stats.total}</strong><span className="stat-description">applications tracked</span></div>
          <div className="stat-card"><span className="stat-label">ACTIVE PIPELINE</span><strong>{stats.active}</strong><span className="stat-description">opportunities in motion</span></div>
          <div className="stat-card"><span className="stat-label">INTERVIEWS</span><strong>{stats.interviews}</strong><span className="stat-description">conversations underway</span></div>
          <div className="stat-card"><span className="stat-label">SELECTED</span><strong>{stats.selected}</strong><span className="stat-description">positive outcomes</span></div>
        </section>

        <section className="search-command">
          <div className="search-command-heading">
            <div><span className="eyebrow">APPLICATION INDEX</span><h2>Find an opportunity</h2></div>
            <span className="result-count">{jobs.length} result{jobs.length !== 1 ? "s" : ""}</span>
          </div>

          <form onSubmit={handleSearch} className="filters-form">
            <div className="search-field"><span className="field-icon">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or role..." /></div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
            <div className="location-field"><span className="field-icon">⌖</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" /></div>
            <button type="submit" className="search-button">Search</button>
            <button type="button" className="clear-button" onClick={clearFilters}>Reset</button>
          </form>
        </section>

        {error && <div className="applications-error"><strong>Something went wrong</strong><span>{error}</span></div>}

        <section className="applications-list-section">
          <div className="list-heading applications-view-heading">
            <div><span className="eyebrow">YOUR PIPELINE</span><h2>Current opportunities</h2></div>
            <div className="applications-view-controls" role="group" aria-label="Application view">
              <button
                type="button"
                className={`view-toggle ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
              >☷ <span>Table View</span></button>
              <button
                type="button"
                className={`view-toggle ${viewMode === "kanban" ? "active" : ""}`}
                onClick={() => setViewMode("kanban")}
                aria-pressed={viewMode === "kanban"}
              >▦ <span>Kanban Board</span></button>
            </div>
          </div>

          {boardMessage && <div className="kanban-success" role="status">✓ {boardMessage}</div>}

          {jobs.length === 0 ? (
            <div className="applications-empty">
              <div className="empty-mark">+</div>
              <h2>No applications found</h2>
              <p>Try changing your filters or add your first opportunity to JobFlow.</p>
              <Link to="/add-job" className="empty-button">Add your first application</Link>
            </div>
          ) : viewMode === "table" ? (
            <div className="applications-table-wrap">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Company / Role</th>
                    <th>Location</th>
                    <th>Salary</th>
                    <th>Applied</th>
                    <th>Status</th>
                    <th><span className="sr-only">Actions</span>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job._id}>
                      <td>
                        <div className="table-company">
                          <span className="table-company-mark">{getInitials(job.company)}</span>
                          <span><strong>{job.company || "Unknown company"}</strong><small>{job.jobTitle || "Untitled role"}</small></span>
                        </div>
                      </td>
                      <td>{job.location || "—"}</td>
                      <td>{job.salary || "—"}</td>
                      <td>{displayDate(job.appliedDate || job.createdAt)}</td>
                      <td><span className={`application-status ${statusClass(job.status)}`}><i />{job.status || "Wishlist"}</span></td>
                      <td><Link to={`/applications/${job._id}`} className="table-open-link">Open ↗</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="kanban-board" aria-label="Applications grouped by status">
              {STATUS_OPTIONS.map((statusName) => {
                const columnJobs = jobsByStatus[statusName] || [];
                return (
                  <section
                    className={`kanban-column ${statusClass(statusName)} ${draggedJobId ? "kanban-drag-active" : ""}`}
                    key={statusName}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleBoardDrop(event, statusName)}
                  >
                    <header className="kanban-column-header">
                      <div>
                        <span className={`kanban-status-dot ${statusClass(statusName)}`} />
                        <h3>{statusName}</h3>
                      </div>
                      <span className="kanban-column-count">{columnJobs.length}</span>
                    </header>
                    <div className="kanban-column-body">
                      {columnJobs.length ? columnJobs.map((job) => (
                        <article
                          className={`kanban-card ${draggedJobId === job._id ? "is-dragged" : ""}`}
                          key={job._id}
                          draggable={updatingJobId !== job._id}
                          onDragStart={(event) => handleDragStart(event, job)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="kanban-card-topline">
                            <span className="kanban-company-mark">{getInitials(job.company)}</span>
                            <span className="kanban-drag-handle" aria-label="Drag to change status" title="Drag to change status">⠿</span>
                          </div>
                          <p className="kanban-company">{job.company || "Unknown company"}</p>
                          <h4>{job.jobTitle || "Untitled role"}</h4>
                          <div className="kanban-card-meta">
                            <span>⌖ {job.location || "Location not specified"}</span>
                            {job.salary && <span>₹ {job.salary}</span>}
                            <span>◷ {displayDate(job.appliedDate || job.createdAt)}</span>
                          </div>
                          <div className="kanban-card-footer">
                            <Link to={`/applications/${job._id}`} className="kanban-open-link">View details ↗</Link>
                            <label className="kanban-mobile-status">
                              <span className="sr-only">Change status</span>
                              <select
                                aria-label={`Change ${job.company || "application"} status`}
                                value={job.status || "Wishlist"}
                                disabled={updatingJobId === job._id}
                                onChange={(event) => updateJobStatus(job._id, event.target.value)}
                              >
                                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </label>
                          </div>
                          {updatingJobId === job._id && <span className="kanban-saving">Saving status…</span>}
                        </article>
                      )) : (
                        <div className="kanban-drop-hint">
                          <span>＋</span>
                          <p>Drop an application here</p>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <footer className="applications-footer"><span>JOBFLOW AI</span><span>Application workspace</span></footer>
      </div>
    </div>
  );
}

export default Applications;
