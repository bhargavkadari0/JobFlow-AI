import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
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
      const response = await api.post("/auth/login", formData);

      setMessage(response.data.message);

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-grid"></div>
      <div className="login-orb login-orb-one"></div>
      <div className="login-orb login-orb-two"></div>

      <div className="login-shell">
        {/* BRAND PANEL */}
        <section className="login-brand-panel">
          <div className="brand-top">
            <div className="brand-mark">
              JF
            </div>

            <span>JOBFLOW AI</span>
          </div>

          <div className="brand-content">
            <p className="brand-kicker">
              AI-POWERED JOB WORKSPACE
            </p>

            <h1>
              Your career.
              <br />
              <span>Your workflow.</span>
            </h1>

            <p className="brand-description">
              Track applications, organize opportunities and use
              AI to make smarter decisions throughout your job
              search.
            </p>
          </div>

          <div className="brand-footer">
            <span>01</span>
            <div className="brand-line"></div>
            <span>JOB SEARCH / 2026</span>
          </div>
        </section>

        {/* LOGIN PANEL */}
        <section className="login-form-panel">
          <div className="login-form-inner">
            <div className="login-heading">
              <p className="login-kicker">
                WELCOME BACK
              </p>

              <h2>Sign in</h2>

              <p>
                Access your JobFlow AI workspace.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={handleSubmit}
            >
              <div className="login-field">
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

              <div className="login-field">
                <div className="password-label-row">
                  <label htmlFor="password">
                    Password
                  </label>

                  <span>SECURE ACCESS</span>
                </div>

                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-loader"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    Enter Workspace
                    <span>↗</span>
                  </>
                )}
              </button>
            </form>

            {message && (
              <div className="login-message login-success">
                <span>✓</span>
                {message}
              </div>
            )}

            {error && (
              <div className="login-message login-error">
                <span>!</span>
                {error}
              </div>
            )}

            <div className="login-divider">
              <span></span>
              <small>NEW TO JOBFLOW AI?</small>
              <span></span>
            </div>

            <Link
              to="/register"
              className="register-link"
            >
              Create your account
              <span>→</span>
            </Link>

            <p className="login-security-note">
              Your session is protected using secure
              authentication and HTTP-only cookies.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;