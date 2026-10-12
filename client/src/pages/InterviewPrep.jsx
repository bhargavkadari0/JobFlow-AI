import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./InterviewPrep.css";

const TABS = [
  { key: "technicalQuestions", label: "Technical", number: "01" },
  { key: "hrQuestions", label: "HR & Behavioural", number: "02" },
  { key: "projectQuestions", label: "Project-based", number: "03" },
];

function InterviewPrep() {
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [kit, setKit] = useState(null);
  const [activeTab, setActiveTab] = useState("technicalQuestions");
  const [expanded, setExpanded] = useState(0);

  const [mockIndex, setMockIndex] = useState(0);
  const [mockAnswer, setMockAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [evaluationError, setEvaluationError] = useState("");
  const [mockMode, setMockMode] = useState(false);

  // Store completed answers and scores for the session scorecard.
  const [completedAnswers, setCompletedAnswers] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        const response = await api.get("/jobs");

        if (!active) return;

        const data = response.data?.data || [];

        setJobs(data);

        if (data.length) {
          setJobId(data[0]._id);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load your applications."
          );
        }
      } finally {
        if (active) {
          setLoadingJobs(false);
        }
      }
    }

    loadJobs();

    return () => {
      active = false;
    };
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === jobId),
    [jobs, jobId]
  );

  const questions = kit?.[activeTab] || [];

  const mockQuestions = useMemo(
    () => [
      ...(kit?.technicalQuestions || []).map((item) => ({
        ...item,
        category: "Technical",
      })),
      ...(kit?.hrQuestions || []).map((item) => ({
        ...item,
        category: "HR",
      })),
      ...(kit?.projectQuestions || []).map((item) => ({
        ...item,
        category: "Project",
      })),
    ],
    [kit]
  );

  const currentMockQuestion = mockQuestions[mockIndex];

  const averageScore = completedAnswers.length
    ? Math.round(
        completedAnswers.reduce((total, item) => total + item.score, 0) /
          completedAnswers.length
      )
    : 0;

  const strongestAnswer = completedAnswers.length
    ? completedAnswers.reduce((best, item) =>
        item.score > best.score ? item : best
      )
    : null;

  const improvementAreas = [
    ...new Set(
      completedAnswers.flatMap((item) => item.improvements || [])
    ),
  ].slice(0, 5);

  async function generateKit(event) {
    event?.preventDefault();

    if (!jobId) {
      setError("First add a job application, then select it here.");
      return;
    }

    setGenerating(true);
    setError("");
    setKit(null);
    setFeedback(null);
    setMockMode(false);
    setCompletedAnswers([]);
    setMockAnswer("");
    setMockIndex(0);

    try {
      const response = await api.post("/ai/interview-prep", {
        jobId,
        difficulty,
      });

      setKit(response.data.data);
      setActiveTab("technicalQuestions");
      setExpanded(0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Interview preparation could not be generated."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function evaluateAnswer(event) {
    event.preventDefault();

    if (!currentMockQuestion || !mockAnswer.trim() || !jobId) {
      setEvaluationError("Select a job and enter your answer before requesting feedback.");
      return;
    }

    setEvaluating(true);
    setError("");
    setEvaluationError("");
    setFeedback(null);

    try {
      const response = await api.post("/ai/evaluate-answer", {
        jobId,
        question: currentMockQuestion.question,
        answer: mockAnswer.trim(),
        category: currentMockQuestion.category,
      });

      const result = response.data?.data;

      if (!response.data?.success || !result || typeof result !== "object") {
        throw new Error(
          response.data?.message || "The server returned an unexpected feedback response."
        );
      }

      setFeedback(result);

      setCompletedAnswers((previous) => {
        const existingIndex = previous.findIndex(
          (item) => item.question === currentMockQuestion.question
        );

        const entry = {
          question: currentMockQuestion.question,
          category: currentMockQuestion.category,
          answer: mockAnswer.trim(),
          score: Number(result.score) || 0,
          strengths: Array.isArray(result.strengths) ? result.strengths : [],
          improvements: Array.isArray(result.improvements) ? result.improvements : [],
          sampleAnswer: result.sampleAnswer || "",
        };

        if (existingIndex !== -1) {
          const updated = [...previous];
          updated[existingIndex] = entry;
          return updated;
        }

        return [...previous, entry];
      });
    } catch (err) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message || err.response?.data?.error;

      let message = serverMessage || err.message || "Could not evaluate this answer.";

      if (status === 503 || /high demand|service unavailable|temporarily busy/i.test(message)) {
        message = "Gemini AI is temporarily busy. Please wait a little and click Get AI feedback again.";
      } else if (status === 429) {
        message = "Gemini API rate limit reached. Please wait before trying again.";
      } else if (status === 401) {
        message = "Your login session may have expired. Please sign in again and retry.";
      } else if (!err.response && /network error|failed to fetch/i.test(message)) {
        message = "Cannot reach the backend. Check that the server is running on port 5000.";
      }

      setEvaluationError(message);
    } finally {
      setEvaluating(false);
    }
  }

    function nextMockQuestion() {
    if (!mockQuestions.length) return;

    setMockIndex((index) =>
      Math.min(index + 1, mockQuestions.length - 1)
    );

    setMockAnswer("");
    setFeedback(null);
    setEvaluationError("");
    setError("");
  }

  function previousMockQuestion() {
    if (!mockQuestions.length) return;

    setMockIndex((index) => Math.max(index - 1, 0));

    setMockAnswer("");
    setFeedback(null);
    setEvaluationError("");
    setError("");
  }

  function copyQuestion(item) {
    const content = `${item.question}\n\nSample answer:\n${item.sampleAnswer}`;

    navigator.clipboard?.writeText(content).catch(() => {
      setError("Could not copy the question. Please copy it manually.");
    });
  }

  function startPracticeAtQuestion(item) {
    const index = mockQuestions.findIndex(
      (question) => question.question === item.question
    );

    setMockIndex(Math.max(0, index));
    setMockAnswer("");
    setFeedback(null);
    setEvaluationError("");
    setError("");
    setMockMode(true);

    setTimeout(() => {
      document
        .getElementById("prep-mock-session")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function resetPractice() {
    setMockIndex(0);
    setMockAnswer("");
    setFeedback(null);
    setEvaluationError("");
    setCompletedAnswers([]);
    setError("");
  }

  return (
    <main className="interview-prep-page">
      <div className="interview-prep-shell">
        <div className="prep-topline">
          <Link to="/dashboard" className="prep-back">
            ← Dashboard
          </Link>

          <span className="prep-product-mark">
            <span>JF</span> JOBFLOW AI <i> / </i> INTERVIEW LAB
          </span>
        </div>

        <header className="prep-hero">
          <div className="prep-hero-copy">
            <p className="prep-eyebrow">
              <span className="prep-live-dot" />
              AI CAREER INTELLIGENCE
            </p>

            <h1>
              Walk into your
              <br />
              <em>next interview</em> prepared.
            </h1>

            <p className="prep-hero-description">
              Turn a job application into a focused interview plan, realistic
              sample answers, and a practice session with AI feedback.
            </p>
          </div>

          <div className="prep-hero-art" aria-hidden="true">
            <div className="prep-orbit prep-orbit-one" />
            <div className="prep-orbit prep-orbit-two" />

            <div className="prep-art-core">
              <span>AI</span>
              <b>
                INTERVIEW
                <br />
                INTELLIGENCE
              </b>
            </div>

            <span className="prep-art-tag tag-top">ROLE-AWARE</span>
            <span className="prep-art-tag tag-bottom">
              PRACTICE / REFINE
            </span>
          </div>
        </header>

        <section className="prep-selector-card">
          <div className="prep-selector-label">
            <span className="prep-step-number">01</span>

            <div>
              <strong>Choose your opportunity</strong>
              <p>
                Questions are tailored to the selected application and its
                saved job description.
              </p>
            </div>
          </div>

          <form className="prep-selector-form" onSubmit={generateKit}>
            <label htmlFor="prep-job-select">APPLICATION</label>

            <select
              id="prep-job-select"
              value={jobId}
              onChange={(event) => {
                setJobId(event.target.value);
                setKit(null);
                setFeedback(null);
                setEvaluationError("");
                setCompletedAnswers([]);
                setMockMode(false);
                setError("");
              }}
              disabled={loadingJobs || !jobs.length}
            >
              {loadingJobs && (
                <option value="">Loading applications...</option>
              )}

              {!loadingJobs && !jobs.length && (
                <option value="">No applications yet</option>
              )}

              {jobs.map((job) => (
                <option value={job._id} key={job._id}>
                  {job.jobTitle} — {job.company}
                </option>
              ))}
            </select>

            <label htmlFor="prep-difficulty">DIFFICULTY</label>

            <select
              id="prep-difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              disabled={generating}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>

            <button
              type="submit"
              disabled={generating || loadingJobs || !jobId}
            >
              {generating ? (
                <>
                  <span className="prep-spinner" />
                  Building your kit...
                </>
              ) : (
                <>
                  {kit ? "↻ Regenerate kit" : "✦ Generate interview kit"}
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {selectedJob && (
            <div className="prep-selected-meta">
              <span>
                {selectedJob.location || "Location not specified"}
              </span>

              <span className="prep-meta-divider" />

              <span
                className={`prep-status prep-status-${(
                  selectedJob.status || "wishlist"
                ).toLowerCase()}`}
              >
                {selectedJob.status || "Wishlist"}
              </span>

              {!selectedJob.jobDescription?.trim() && (
                <span className="prep-description-warning">
                  No job description saved — questions will be role-based.
                </span>
              )}
            </div>
          )}
        </section>

        {error && (
          <div className="prep-error" role="alert">
            <strong>Unable to continue</strong>
            <span>{error}</span>
          </div>
        )}

        {!kit && !generating && !jobs.length && !loadingJobs && (
          <section className="prep-empty-state">
            <div className="prep-empty-symbol">＋</div>
            <h2>Your preparation starts with an application.</h2>
            <p>
              Add a role to your tracker first. Then JobFlow can build a more
              relevant interview kit.
            </p>
            <Link to="/add-job">Add an application →</Link>
          </section>
        )}

        {generating && (
          <section className="prep-generating">
            <div className="prep-generation-mark">JF</div>

            <div>
              <p className="prep-eyebrow">GEMINI IS WORKING</p>
              <h2>Building a role-specific preparation plan</h2>
              <p>
                Creating technical, HR, and project-based questions with
                sample answers.
              </p>
            </div>

            <div className="prep-loading-line">
              <span />
            </div>
          </section>
        )}

        {kit && !generating && (
          <>
            <section className="prep-overview-card">
              <div className="prep-overview-icon">✦</div>

              <div>
                <p className="prep-eyebrow">YOUR INTERVIEW BRIEF</p>

                <h2>
                  {selectedJob?.jobTitle || "Interview preparation"}
                  <span> @ {selectedJob?.company || "Company"}</span>
                </h2>

                <p>
                  {kit.overview ||
                    `Your ${difficulty.toLowerCase()}-level preparation kit is ready. Review the questions, then practice answering them with AI feedback.`}
                </p>
              </div>

              <div className="prep-overview-count">
                <strong>
                  {(kit.technicalQuestions?.length || 0) +
                    (kit.hrQuestions?.length || 0) +
                    (kit.projectQuestions?.length || 0)}
                </strong>
                <span>QUESTIONS</span>
              </div>
            </section>

            <section className="prep-question-section">
              <div className="prep-section-heading">
                <div>
                  <p className="prep-eyebrow">PREPARATION LIBRARY</p>
                  <h2>Practice with purpose.</h2>
                </div>

                <span className="prep-heading-note">
                  READ · UNDERSTAND · REHEARSE
                </span>
              </div>

              <div className="prep-tabs" role="tablist">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    className={
                      activeTab === tab.key ? "prep-tab active" : "prep-tab"
                    }
                    onClick={() => {
                      setActiveTab(tab.key);
                      setExpanded(0);
                    }}
                  >
                    <span>{tab.number}</span>
                    {tab.label}
                    <b>{kit[tab.key]?.length || 0}</b>
                  </button>
                ))}
              </div>

              <div className="prep-question-list">
                {questions.map((item, index) => (
                  <article
                    className={`prep-question-card ${
                      expanded === index ? "is-expanded" : ""
                    }`}
                    key={`${activeTab}-${index}`}
                  >
                    <button
                      type="button"
                      className="prep-question-trigger"
                      onClick={() =>
                        setExpanded(expanded === index ? -1 : index)
                      }
                      aria-expanded={expanded === index}
                    >
                      <span className="prep-question-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span className="prep-question-title">
                        {item.question}
                        <small>
                          {item.topic || item.whyAsked || "Interview practice"}
                        </small>
                      </span>

                      <span
                        className={`prep-difficulty difficulty-${(
                          item.difficulty || difficulty
                        ).toLowerCase()}`}
                      >
                        {item.difficulty || difficulty}
                      </span>

                      <span className="prep-expand-icon">
                        {expanded === index ? "−" : "+"}
                      </span>
                    </button>

                    {expanded === index && (
                      <div className="prep-answer-panel">
                        <p className="prep-answer-label">
                          SAMPLE ANSWER / FRAMEWORK
                        </p>

                        <p className="prep-sample-answer">
                          {item.sampleAnswer}
                        </p>

                        <div className="prep-answer-actions">
                          <button
                            onClick={() => copyQuestion(item)}
                            type="button"
                          >
                            Copy question + answer
                          </button>

                          <button
                            onClick={() => startPracticeAtQuestion(item)}
                            type="button"
                          >
                            Practice this question ↗
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="prep-study-plan">
              <div>
                <p className="prep-eyebrow">BEFORE THE INTERVIEW</p>
                <h2>Your preparation checklist</h2>
                <p className="prep-plan-subtitle">
                  Small focused sessions beat last-minute cramming.
                </p>
              </div>

              <ol>
                {(kit.studyChecklist || kit.studyPlan || []).map(
                  (task, index) => (
                    <li key={index}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {task}
                    </li>
                  )
                )}
              </ol>
            </section>

            <section className="prep-mock-section" id="prep-mock-session">
              <div className="prep-section-heading">
                <div>
                  <p className="prep-eyebrow">LIVE PRACTICE MODE</p>
                  <h2>Mock interview</h2>
                  <p className="prep-plan-subtitle">
                    Answer in your own words. Gemini gives constructive
                    feedback.
                  </p>
                </div>

                <button
                  className="prep-mock-toggle"
                  onClick={() => {
                    setMockMode(!mockMode);
                    setFeedback(null);
                    setEvaluationError("");
                    setError("");
                  }}
                  type="button"
                  disabled={!mockQuestions.length}
                >
                  {mockMode ? "Close practice" : "Start mock interview"}
                  <span>→</span>
                </button>
              </div>

              {mockMode && currentMockQuestion && (
                <div className="prep-mock-card">
                  <div className="prep-mock-progress">
                    <span>
                      QUESTION {mockIndex + 1} / {mockQuestions.length}
                    </span>
                    <span>
                      {currentMockQuestion.category} ·{" "}
                      {currentMockQuestion.difficulty || difficulty}
                    </span>
                  </div>

                  <h3>{currentMockQuestion.question}</h3>

                  <form onSubmit={evaluateAnswer}>
                    <label htmlFor="mock-answer">YOUR ANSWER</label>

                    <textarea
                      id="mock-answer"
                      value={mockAnswer}
                      onChange={(event) => setMockAnswer(event.target.value)}
                      placeholder="Structure your answer clearly. Explain your thinking and use a real example where possible..."
                      rows={6}
                      required
                      maxLength={10000}
                    />

                    <div className="prep-mock-actions">
                      <span>
                        {mockAnswer.trim().split(/\s+/).filter(Boolean).length}{" "}
                        words
                      </span>

                      <button
                        type="submit"
                        disabled={evaluating || !mockAnswer.trim()}
                      >
                        {evaluating ? (
                          <>
                            <span className="prep-spinner" />
                            Reviewing...
                          </>
                        ) : (
                          "Get AI feedback →"
                        )}
                      </button>
                    </div>
                  </form>

                  {evaluationError && (
                    <div className="prep-error" role="alert" aria-live="polite">
                      <strong>AI feedback unavailable</strong>
                      <span>{evaluationError}</span>
                      <button
                        type="button"
                        onClick={() => setEvaluationError("")}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {feedback && (
                    <div className="prep-feedback">
                      <div className="prep-score">
                        <strong>{feedback.score ?? 0}</strong>
                        <span>/100</span>
                      </div>

                      <div className="prep-feedback-main">
                        <p className="prep-eyebrow">AI COACH FEEDBACK</p>

                        <h4>
                          {feedback.overallFeedback ||
                            feedback.verdict ||
                            "Your answer has been evaluated."}
                        </h4>

                        <div className="prep-feedback-columns">
                          <div>
                            <strong>What worked</strong>
                            <ul>
                              {(feedback.strengths || []).map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <strong>How to improve</strong>
                            <ul>
                              {(feedback.improvements || []).map(
                                (item, index) => (
                                  <li key={index}>{item}</li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="prep-feedback-sample">
                          <strong>Example answer to learn from</strong>
                          <p>{feedback.sampleAnswer}</p>
                        </div>

                        <div className="prep-next-question">
                          <strong>Coach's next tip</strong>
                          <p>
                            {feedback.nextTip ||
                              feedback.nextQuestion ||
                              "Review the feedback and try to make your answer more specific."}
                          </p>
                        </div>

                        <div className="prep-mock-navigation">
                          <button
                            type="button"
                            onClick={previousMockQuestion}
                            disabled={mockIndex === 0}
                          >
                            ← Previous
                          </button>

                          <button
                            className="prep-next-button"
                            type="button"
                            onClick={nextMockQuestion}
                            disabled={mockIndex >= mockQuestions.length - 1}
                          >
                            {mockIndex >= mockQuestions.length - 1
                              ? "Last question reached"
                              : "Next practice question →"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mockMode && mockQuestions.length > 0 && (
                <p className="prep-plan-subtitle">
                  Tip: Answer in your own words before looking at the sample
                  answer. Your progress is kept for this page session.
                </p>
              )}
            </section>

            {completedAnswers.length > 0 && (
              <section className="prep-study-plan prep-scorecard">
                <div>
                  <p className="prep-eyebrow">YOUR PRACTICE RESULTS</p>
                  <h2>Performance scorecard</h2>
                  <p className="prep-plan-subtitle">
                    Based on the questions you have answered in this session.
                  </p>
                </div>

                <div className="prep-scorecard-grid">
                  <article>
                    <span>QUESTIONS REVIEWED</span>
                    <strong>{completedAnswers.length}</strong>
                  </article>

                  <article>
                    <span>AVERAGE SCORE</span>
                    <strong>{averageScore}/100</strong>
                  </article>

                  <article>
                    <span>STRONGEST SCORE</span>
                    <strong>{strongestAnswer?.score ?? 0}/100</strong>
                  </article>
                </div>

                {strongestAnswer && (
                  <div className="prep-feedback-sample">
                    <strong>Strongest answer</strong>
                    <p>{strongestAnswer.question}</p>
                    <p>Score: {strongestAnswer.score}/100</p>
                  </div>
                )}

                {improvementAreas.length > 0 && (
                  <div className="prep-feedback-sample">
                    <strong>Areas to improve</strong>
                    <ul>
                      {improvementAreas.map((area, index) => (
                        <li key={index}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  className="prep-next-button"
                  type="button"
                  onClick={resetPractice}
                >
                  Reset practice scorecard
                </button>
              </section>
            )}
          </>
        )}

        <footer className="prep-footer">
          <span>JOBFLOW AI</span>
          <span>Prepare with intent. Show up with confidence.</span>
          <Link to="/applications">Back to applications ↑</Link>
        </footer>
      </div>
    </main>
  );
}

export default InterviewPrep;