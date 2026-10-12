import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/register", formData);

      setMessage(response.data.message);

      setFormData({
        name: "",
        email: "",
        password: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-grid"></div>
      <div className="register-orb register-orb-one"></div>
      <div className="register-orb register-orb-two"></div>

      <div className="register-shell">
        {/* FORM PANEL */}
        <section className="register-form-panel">
          <div className="register-form-inner">
            <div className="register-brand">
              <div className="register-brand-mark">
                JF
              </div>

              <span>JOBFLOW AI</span>
            </div>

            <div className="register-heading">
              <p className="register-kicker">
                START YOUR WORKSPACE
              </p>

              <h1>Create account</h1>

              <p>
                Build a focused workspace for your job search.
              </p>
            </div>

            <form
              className="register-form"
              onSubmit={handleSubmit}
            >
              <div className="register-field">
                <label htmlFor="name">
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="register-field">
                <label htmlFor="email">
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="register-field">
                <div className="register-password-label">
                  <label htmlFor="password">
                    Password
                  </label>

                  <span>MIN. SECURE PASSWORD</span>
                </div>

                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create your password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="register-loader"></span>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Workspace
                    <span>↗</span>
                  </>
                )}
              </button>
            </form>

            {message && (
              <div className="register-message register-success">
                <span>✓</span>
                {message}
              </div>
            )}

            {error && (
              <div className="register-message register-error">
                <span>!</span>
                {error}
              </div>
            )}

            <div className="register-divider">
              <span></span>
              <small>ALREADY REGISTERED?</small>
              <span></span>
            </div>

            <Link
              to="/login"
              className="login-existing-link"
            >
              Sign in to your workspace
              <span>→</span>
            </Link>

            <p className="register-security-note">
              By creating an account, your workspace will be
              protected with secure authentication.
            </p>
          </div>
        </section>

        {/* BRAND PANEL */}
        <section className="register-brand-panel">
          <div className="register-brand-top">
            <span>01</span>
            <div></div>
            <span>JOBFLOW / WORKSPACE</span>
          </div>

          <div className="register-brand-content">
            <p>ONE WORKSPACE. EVERY OPPORTUNITY.</p>

            <h2>
              Turn your
              <br />
              <span>job search</span>
              <br />
              into a system.
            </h2>

            <div className="register-feature-list">
              <div className="register-feature">
                <span>01</span>

                <div>
                  <strong>Track</strong>
                  <p>
                    Keep every application organized in one
                    workspace.
                  </p>
                </div>
              </div>

              <div className="register-feature">
                <span>02</span>

                <div>
                  <strong>Analyze</strong>
                  <p>
                    Use AI to understand job requirements and
                    skill gaps.
                  </p>
                </div>
              </div>

              <div className="register-feature">
                <span>03</span>

                <div>
                  <strong>Move forward</strong>
                  <p>
                    Follow your pipeline from wishlist to
                    successful outcome.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="register-brand-footer">
            <span>AI-POWERED</span>
            <span>JOB MANAGEMENT</span>
            <span>2026</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;