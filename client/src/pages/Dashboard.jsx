import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../api/axios";
import "./Dashboard.css";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [monthlyTrendLoading, setMonthlyTrendLoading] = useState(true);

  async function fetchDashboardStats(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      setError("");

      const [statsResponse, followUpsResponse, insightsResponse, analyticsResponse] =
        await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/jobs/follow-ups"),
          api.get("/dashboard/insights"),
          api.get("/dashboard/analytics"),
        ]);

      setStats(statsResponse.data.data);

      const followUpData = followUpsResponse.data.data;
      setFollowUps(Array.isArray(followUpData) ? followUpData : []);

      setInsights(insightsResponse.data.data);
      setAnalytics(analyticsResponse.data.data);

      // Load monthly trend separately so a trend endpoint issue does not
      // prevent the rest of the dashboard from loading.
      try {
        const monthlyTrendResponse = await api.get("/dashboard/monthly-trend");
        const responseBody = monthlyTrendResponse.data;
        const monthlyTrendData = Array.isArray(responseBody)
          ? responseBody
          : Array.isArray(responseBody?.data)
            ? responseBody.data
            : Array.isArray(responseBody?.data?.data)
              ? responseBody.data.data
              : [];
        setMonthlyTrend(
          monthlyTrendData.map((item) => ({
            month: String(item.month ?? item.label ?? "Month"),
            applications: Number(item.applications ?? item.count ?? 0) || 0,
          }))
        );
      } catch (monthlyTrendError) {
        console.error("Monthly application trend error:", monthlyTrendError);
        setMonthlyTrend([]);
      } finally {
        setMonthlyTrendLoading(false);
      }

      setLastSynced(new Date());
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load dashboard data."
      );
    } finally {
      setInsightsLoading(false);
      setAnalyticsLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const pipeline = useMemo(() => {
    if (!stats) return [];

    return [
      {
        key: "wishlist",
        label: "Wishlist",
        value: stats.wishlist,
        tone: "wishlist",
      },
      {
        key: "applied",
        label: "Applied",
        value: stats.applied,
        tone: "applied",
      },
      {
        key: "assessment",
        label: "Assessment",
        value: stats.assessment,
        tone: "assessment",
      },
      {
        key: "interview",
        label: "Interview",
        value: stats.interview,
        tone: "interview",
      },
      {
        key: "selected",
        label: "Selected",
        value: stats.selected,
        tone: "selected",
      },
      {
        key: "rejected",
        label: "Rejected",
        value: stats.rejected,
        tone: "rejected",
      },
    ];
  }, [stats]);

  if (error) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-error">
          <span className="error-mark">!</span>

          <div>
            <p className="eyebrow">SYSTEM NOTICE</p>
            <h2>Dashboard unavailable</h2>
            <p>{error}</p>
          </div>

          <Link to="/applications" className="error-action">
            Open Applications
          </Link>
        </section>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="dashboard-page dashboard-loading">
        <div className="loading-orbit">
          <span></span>
        </div>

        <p>Loading your JobFlow workspace...</p>
      </main>
    );
  }

  const activeApplications =
    stats.applied + stats.assessment + stats.interview;

  const progress =
    stats.totalApplications > 0
      ? Math.round((stats.selected / stats.totalApplications) * 100)
      : 0;

  const getFollowUpState = (dateValue) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followUpDate = new Date(dateValue);
    followUpDate.setHours(0, 0, 0, 0);

    const difference =
      Math.round((followUpDate - today) / (1000 * 60 * 60 * 24));

    if (difference < 0) {
      return { label: "Overdue", tone: "overdue" };
    }

    if (difference === 0) {
      return { label: "Due today", tone: "today" };
    }

    if (difference === 1) {
      return { label: "Tomorrow", tone: "upcoming" };
    }

    return {
      label: `${difference} days`,
      tone: "upcoming",
    };
  };

  const formatFollowUpDate = (dateValue) =>
    new Date(dateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <main className="dashboard-page">
      <div className="dashboard-grid"></div>
      <div className="dashboard-glow dashboard-glow-one"></div>
      <div className="dashboard-glow dashboard-glow-two"></div>

      <div className="dashboard-shell">
        {/* HEADER */}
        <header className="dashboard-header">
          <div>
            <div className="dashboard-kicker">
              <span className="kicker-dot"></span>
              JOBFLOW AI / WORKSPACE
            </div>

            <h1>
              Your job search,
              <span> in control.</span>
            </h1>

            <p className="dashboard-subtitle">
              Track applications, monitor your pipeline and keep every
              opportunity moving forward.
            </p>

            {lastSynced && (
              <div
                style={{
                  marginTop: "14px",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                }}
              >
                Live workspace · Synced{" "}
                {lastSynced.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>

          <div className="dashboard-header-actions">
            <button
              type="button"
              className="dashboard-secondary-btn"
              onClick={() => fetchDashboardStats(true)}
              disabled={refreshing}
              style={{
                cursor: refreshing ? "wait" : "pointer",
                opacity: refreshing ? 0.7 : 1,
                border: "none",
                fontFamily: "inherit",
              }}
            >
              <span>{refreshing ? "↻" : "⟳"}</span>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <Link to="/applications" className="dashboard-secondary-btn">
              View Applications
            </Link>

            <Link to="/interview-prep" className="dashboard-secondary-btn">
              Interview Prep ↗
            </Link>

            <Link to="/add-job" className="dashboard-primary-btn">
              <span>+</span>
              Add Application
            </Link>
          </div>
        </header>

        {/* TOP METRICS */}
        <section className="metric-grid">
          <article className="metric-card metric-main">
            <div className="metric-top">
              <span>Total Applications</span>
              <span className="metric-icon">01</span>
            </div>

            <div className="metric-number">{stats.totalApplications}</div>

            <div className="metric-bottom">
              <span>All opportunities</span>
              <span className="metric-line"></span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              <span>Active Pipeline</span>
              <span className="metric-icon">02</span>
            </div>

            <div className="metric-number">{activeApplications}</div>

            <div className="metric-bottom">
              <span>Applications in motion</span>
              <span className="metric-status-dot"></span>
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-top">
              <span>Interviews</span>
              <span className="metric-icon">03</span>
            </div>

            <div className="metric-number">{stats.interview}</div>

            <div className="metric-bottom">
              <span>Interview stage</span>
              <span className="metric-arrow">↗</span>
            </div>
          </article>

          <article className="metric-card metric-selected">
            <div className="metric-top">
              <span>Selected</span>
              <span className="metric-icon">04</span>
            </div>

            <div className="metric-number">{stats.selected}</div>

            <div className="metric-bottom">
              <span>Successful outcomes</span>
              <span className="success-mark">✓</span>
            </div>
          </article>
        </section>

        {/* MAIN CONTENT */}
        <section className="dashboard-content">
          {/* PIPELINE */}
          <article className="dashboard-panel pipeline-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">APPLICATION PIPELINE</p>
                <h2>Opportunity flow</h2>
              </div>

              <span className="panel-index">01 / 02</span>
            </div>

            <div className="pipeline-list">
              {pipeline.map((item) => {
                const percentage =
                  stats.totalApplications > 0
                    ? Math.round(
                        (item.value / stats.totalApplications) * 100
                      )
                    : 0;

                return (
                  <div className="pipeline-row" key={item.key}>
                    <div className={`pipeline-marker ${item.tone}`}></div>

                    <div className="pipeline-name">
                      <span>{item.label}</span>
                      <small>{percentage}% of total</small>
                    </div>

                    <div className="pipeline-track">
                      <div
                        className={`pipeline-fill ${item.tone}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    <strong className="pipeline-value">
                      {item.value}
                    </strong>
                  </div>
                );
              })}
            </div>
          </article>

          {/* PERFORMANCE */}
          <article className="dashboard-panel performance-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-label">OUTCOME SIGNAL</p>
                <h2>Selection rate</h2>
              </div>

              <span className="panel-index">02 / 02</span>
            </div>

            <div className="performance-center">
              <div
                className="performance-ring"
                style={{
                  "--progress": `${progress * 3.6}deg`,
                }}
              >
                <div className="performance-inner">
                  <strong>{progress}%</strong>
                  <span>Selected</span>
                </div>
              </div>
            </div>

            <div className="performance-copy">
              <strong>
                {stats.selected > 0
                  ? "Keep the momentum."
                  : "Build your pipeline."}
              </strong>

              <p>
                {stats.selected > 0
                  ? "You already have successful outcomes. Continue focusing on high-fit opportunities."
                  : "Add more relevant opportunities and use AI analysis to improve your application strategy."}
              </p>
            </div>
          </article>
        </section>

        {/* STATUS SNAPSHOT */}
        <details className="dashboard-accordion dashboard-accordion-status-snapshot">
          <summary className="dashboard-accordion-summary">
            <span className="dashboard-accordion-index">+</span>
            <span className="dashboard-accordion-copy"><small>JOBFLOW AI / INSIGHTS</small><strong>Where things stand</strong><em>VIEW STATUS SNAPSHOT</em></span>
            <span className="dashboard-accordion-toggle"><span>View details</span><b aria-hidden="true">↓</b></span>
          </summary>
          <div className="dashboard-accordion-content">
<section className="snapshot-section">
          <div className="snapshot-heading">
            <div>
              <p className="panel-label">STATUS SNAPSHOT</p>
              <h2>Where things stand</h2>
            </div>

            <Link to="/applications" className="snapshot-link">
              Manage pipeline <span>→</span>
            </Link>
          </div>

          <div className="snapshot-grid">
            <div className="snapshot-card">
              <span className="snapshot-number">
                {stats.wishlist}
              </span>
              <span className="snapshot-label">Wishlist</span>
            </div>

            <div className="snapshot-card">
              <span className="snapshot-number">{stats.applied}</span>
              <span className="snapshot-label">Applied</span>
            </div>

            <div className="snapshot-card">
              <span className="snapshot-number">
                {stats.assessment}
              </span>
              <span className="snapshot-label">Assessment</span>
            </div>

            <div className="snapshot-card">
              <span className="snapshot-number">
                {stats.interview}
              </span>
              <span className="snapshot-label">Interview</span>
            </div>

            <div className="snapshot-card">
              <span className="snapshot-number">
                {stats.selected}
              </span>
              <span className="snapshot-label">Selected</span>
            </div>

            <div className="snapshot-card">
              <span className="snapshot-number">
                {stats.rejected}
              </span>
              <span className="snapshot-label">Rejected</span>
            </div>
          </div>
        </section>
          </div>
        </details>

        {/* WORKSPACE INSIGHTS */}
        <details className="dashboard-accordion dashboard-accordion-quick-read">
          <summary className="dashboard-accordion-summary">
            <span className="dashboard-accordion-index">+</span>
            <span className="dashboard-accordion-copy"><small>JOBFLOW AI / INSIGHTS</small><strong>Quick read</strong><em>VIEW WORKSPACE INSIGHTS</em></span>
            <span className="dashboard-accordion-toggle"><span>View details</span><b aria-hidden="true">↓</b></span>
          </summary>
          <div className="dashboard-accordion-content">
<section className="snapshot-section">
          <div className="snapshot-heading">
            <div>
              <p className="panel-label">WORKSPACE SIGNAL</p>
              <h2>Quick read</h2>
            </div>

            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8a8a8a",
              }}
            >
              Live from your pipeline
            </span>
          </div>

          <div className="snapshot-grid">
            <div className="snapshot-card">
              <span className="snapshot-number">{activeApplications}</span>
              <span className="snapshot-label">In Motion</span>
            </div>

            <div className="snapshot-card">
              <span className="snapshot-number">
                {stats.totalApplications - stats.rejected}
              </span>
              <span className="snapshot-label">Not Rejected</span>
            </div>

            <div className="snapshot-card">
              <span className="snapshot-number">
                {stats.interview + stats.selected}
              </span>
              <span className="snapshot-label">Late Stage</span>
            </div>

            <div className="snapshot-card">
              <span className="snapshot-number">{progress}%</span>
              <span className="snapshot-label">Selection Rate</span>
            </div>
          </div>
        </section>
          </div>
        </details>

        {/* FOLLOW-UPS */}
        <section className="followups-section">
          <div className="snapshot-heading">
            <div>
              <p className="panel-label">FOLLOW-UP CONTROL</p>
              <h2>Next actions</h2>
            </div>

            <Link to="/applications" className="snapshot-link">
              View pipeline <span>→</span>
            </Link>
          </div>

          {followUps.length === 0 ? (
            <div className="followups-empty">
              <div>
                <span className="followups-empty-label">CLEAR QUEUE</span>
                <h3>No follow-ups scheduled</h3>
                <p>
                  Add a follow-up date to an application and it will appear
                  here when action is needed.
                </p>
              </div>

              <Link to="/applications" className="followups-empty-action">
                Manage applications
                <span>↗</span>
              </Link>
            </div>
          ) : (
            <div className="followups-list">
              {followUps.slice(0, 5).map((job) => {
                const followUpState = getFollowUpState(job.followUpDate);

                return (
                  <Link
                    to={`/applications/${job._id}`}
                    className="followup-row"
                    key={job._id}
                  >
                    <div className="followup-company">
                      <span className="followup-company-mark">
                        {(job.company || "J").charAt(0).toUpperCase()}
                      </span>

                      <div>
                        <strong>{job.company || "Unknown company"}</strong>
                        <span>{job.jobTitle || "Job application"}</span>
                      </div>
                    </div>

                    <div className="followup-date">
                      <span>{formatFollowUpDate(job.followUpDate)}</span>
                      <small>{followUpState.label}</small>
                    </div>

                    <span
                      className={`followup-state ${followUpState.tone}`}
                    >
                      {followUpState.label}
                    </span>

                    <span className="followup-arrow">↗</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* APPLICATION ANALYTICS */}
        <details className="dashboard-accordion dashboard-accordion-pipeline-performance">
          <summary className="dashboard-accordion-summary">
            <span className="dashboard-accordion-index">+</span>
            <span className="dashboard-accordion-copy"><small>JOBFLOW AI / INSIGHTS</small><strong>Pipeline performance</strong><em>VIEW PIPELINE PERFORMANCE</em></span>
            <span className="dashboard-accordion-toggle"><span>View details</span><b aria-hidden="true">↓</b></span>
          </summary>
          <div className="dashboard-accordion-content">
<section className="snapshot-section dashboard-analytics-section">
          <div className="snapshot-heading">
            <div>
              <p className="panel-label">APPLICATION ANALYTICS</p>
              <h2>Pipeline performance</h2>
            </div>

            <span className="analytics-meta">Live from your applications</span>
          </div>

          {analyticsLoading ? (
            <div className="analytics-loading">Loading analytics...</div>
          ) : analytics ? (
            <>
              <div className="analytics-summary-grid">
                <div className="analytics-summary-card">
                  <span>Total</span>
                  <strong>{analytics.totalApplications}</strong>
                </div>
                <div className="analytics-summary-card">
                  <span>Active</span>
                  <strong>{analytics.activeApplications}</strong>
                </div>
                <div className="analytics-summary-card">
                  <span>Selection rate</span>
                  <strong>{analytics.selectionRate}%</strong>
                </div>
                <div className="analytics-summary-card">
                  <span>Rejection rate</span>
                  <strong>{analytics.rejectionRate}%</strong>
                </div>
              </div>

              <div className="analytics-chart-wrap">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={analytics.statusCounts}
                    margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e9e9e9"
                    />
                    <XAxis
                      dataKey="status"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#777777", fontSize: 10 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#999999", fontSize: 10 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.035)" }}
                      contentStyle={{
                        border: "1px solid #dddddd",
                        borderRadius: "10px",
                        background: "#ffffff",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Applications"
                      fill="#111111"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="analytics-empty">
              Analytics will appear once application data is available.
            </div>
          )}
        </section>
          </div>
        </details>

        {/* MONTHLY APPLICATION TREND */}
        <details className="dashboard-accordion dashboard-accordion-monthly-trend">
          <summary className="dashboard-accordion-summary">
            <span className="dashboard-accordion-index">+</span>
            <span className="dashboard-accordion-copy"><small>JOBFLOW AI / INSIGHTS</small><strong>Monthly application trend</strong><em>VIEW MONTHLY APPLICATION TREND</em></span>
            <span className="dashboard-accordion-toggle"><span>View details</span><b aria-hidden="true">↓</b></span>
          </summary>
          <div className="dashboard-accordion-content">
<section className="snapshot-section monthly-trend-section">
          <div className="snapshot-heading">
            <div>
              <p className="panel-label">APPLICATION ACTIVITY</p>
              <h2>Monthly application trend</h2>
            </div>
            <span className="analytics-meta">Last 6 months</span>
          </div>

          {monthlyTrendLoading ? (
            <div className="monthly-trend-loading">Loading monthly trend...</div>
          ) : monthlyTrend.length > 0 ? (
            <div className="monthly-trend-chart-wrap monthly-trend-native-chart">
              <div className="monthly-trend-y-axis" aria-hidden="true">
                <span>{Math.max(1, ...monthlyTrend.map((item) => Number(item.applications) || 0))}</span>
                <span>{Math.ceil(Math.max(1, ...monthlyTrend.map((item) => Number(item.applications) || 0)) / 2)}</span>
                <span>0</span>
              </div>
              <div className="monthly-trend-plot">
                <div className="monthly-trend-gridline monthly-trend-gridline-top" />
                <div className="monthly-trend-gridline monthly-trend-gridline-middle" />
                <div className="monthly-trend-gridline monthly-trend-gridline-bottom" />
                <div className="monthly-trend-bars">
                  {monthlyTrend.map((item, index) => {
                    const value = Math.max(0, Number(item.applications) || 0);
                    const maximum = Math.max(1, ...monthlyTrend.map((entry) => Number(entry.applications) || 0));
                    const height = value === 0 ? 3 : Math.max(8, (value / maximum) * 100);
                    return (
                      <div className="monthly-trend-bar-column" key={`${item.month}-${index}`}>
                        <span className="monthly-trend-bar-value">{value}</span>
                        <div className="monthly-trend-bar-track">
                          <div
                            className="monthly-trend-bar"
                            style={{ height: `${height}%` }}
                            title={`${item.month}: ${value} applications`}
                          />
                        </div>
                        <span className="monthly-trend-month-label">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="monthly-trend-empty">
              Monthly activity will appear here when applications have an applied date
              within the last six months.
            </div>
          )}
        </section>
          </div>
        </details>

        {/* AI INSIGHTS */}
        <details className="dashboard-accordion dashboard-accordion-application-intelligence">
          <summary className="dashboard-accordion-summary">
            <span className="dashboard-accordion-index">+</span>
            <span className="dashboard-accordion-copy"><small>JOBFLOW AI / INSIGHTS</small><strong>Application intelligence</strong><em>VIEW APPLICATION INTELLIGENCE</em></span>
            <span className="dashboard-accordion-toggle"><span>View details</span><b aria-hidden="true">↓</b></span>
          </summary>
          <div className="dashboard-accordion-content">
<section className="snapshot-section ai-insights-section">
          <div className="snapshot-heading">
            <div>
              <p className="panel-label">AI INTELLIGENCE</p>
              <h2>Application intelligence</h2>
            </div>
            <span className="analytics-meta">Gemini analysis</span>
          </div>

          {insightsLoading ? (
            <div className="ai-insights-loading">Loading application intelligence...</div>
          ) : !insights || insights.analyzedApplications === 0 ? (
            <div className="ai-insights-empty">
              <strong>No AI analysis yet</strong>
              <span>Analyze a job description from an application to build your personalized skill intelligence.</span>
              <Link to="/applications" className="snapshot-link">
                Open Applications <span>→</span>
              </Link>
            </div>
          ) : (
            <div className="ai-insights-grid">
              <div className="ai-insight-card">
                <div className="ai-insight-card-top">
                  <span>01</span>
                  <small>REQUIRED SKILLS</small>
                </div>
                <h3>Most requested</h3>
                <div className="ai-skill-list">
                  {insights.topRequiredSkills.map((item) => (
                    <div className="ai-skill-row" key={item.skill}>
                      <span>{item.skill}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ai-insight-card">
                <div className="ai-insight-card-top">
                  <span>02</span>
                  <small>MISSING SKILLS</small>
                </div>
                <h3>Focus areas</h3>
                <div className="ai-skill-list">
                  {insights.topMissingSkills.length > 0 ? (
                    insights.topMissingSkills.map((item) => (
                      <div className="ai-skill-row" key={item.skill}>
                        <span>{item.skill}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))
                  ) : (
                    <div className="ai-no-missing">No recurring skill gaps detected.</div>
                  )}
                </div>
              </div>

              <div className="ai-insight-summary">
                <span className="cta-eyebrow">ANALYSIS COVERAGE</span>
                <strong>{insights.analyzedApplications}</strong>
                <p>applications analyzed by Gemini. Use these signals to prioritize the skills appearing most often in your target roles.</p>
              </div>
            </div>
          )}
        </section>
          </div>
        </details>

        {/* FOOTER ACTION */}
        <section className="dashboard-cta">
          <div>
            <span className="cta-eyebrow">NEXT MOVE</span>
            <h2>Ready for the next opportunity?</h2>
            <p>
              Add a new application and let JobFlow AI keep your search
              organized.
            </p>
          </div>

          <Link to="/add-job" className="cta-button">
            Create Application
            <span>↗</span>
          </Link>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;