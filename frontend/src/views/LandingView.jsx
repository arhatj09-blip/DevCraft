import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppState";
import { api } from "../services/api";
import AuthInput from "../components/auth/AuthInput";
import PasswordStrengthMeter from "../components/auth/PasswordStrengthMeter";
import { validateAuthForm } from "../utils/authValidation";

function LandingView() {
  const navigate = useNavigate();
  const { auditInput, setAuditInput, pushToast } = useAppState();
  const [authMode, setAuthMode] = useState("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authFeedback, setAuthFeedback] = useState({
    type: "",
    message: "",
  });
  const [authTouched, setAuthTouched] = useState({
    name: false,
    email: false,
    password: false,
    termsAccepted: false,
  });
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    termsAccepted: false,
  });

  const authValidation = useMemo(
    () => validateAuthForm(authForm, authMode),
    [authForm, authMode],
  );

  const authCanSubmit = authValidation.isValid && !authBusy;

  const onAuthFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setAuthForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onAuthFieldBlur = (event) => {
    const { name } = event.target;
    setAuthTouched((prev) => ({ ...prev, [name]: true }));
  };

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const startAuditFlow = () => {
    const githubUrl = auditInput.githubUrl?.trim();
    const liveUrl = auditInput.liveUrl?.trim();

    if (!githubUrl && !liveUrl) {
      pushToast("Please enter a GitHub or live app URL");
      return;
    }

    const params = new URLSearchParams();
    if (githubUrl) params.set("githubUrl", githubUrl);
    if (liveUrl) params.set("liveUrl", liveUrl);

    pushToast("Audit request queued");
    navigate(`/loading?${params.toString()}`);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    startAuditFlow();
  };

  const onAuthSubmit = async (event) => {
    event.preventDefault();

    setAuthTouched({
      name: true,
      email: true,
      password: true,
      termsAccepted: true,
    });

    if (!authValidation.isValid) {
      setAuthFeedback({
        type: "error",
        message: "Please fix highlighted fields and try again.",
      });
      return;
    }

    setAuthFeedback({ type: "", message: "" });
    setAuthBusy(true);

    try {
      const payload = {
        email: authForm.email.trim(),
        password: authForm.password,
        name:
          authMode === "signup" ? authForm.name.trim() || undefined : undefined,
      };

      if (authMode === "signup") {
        await api.signup(payload);
        pushToast("Signup successful. You can now login.");
        setAuthFeedback({
          type: "success",
          message: "Account created. Please sign in.",
        });
        setAuthMode("login");
        setShowPassword(false);
      } else {
        await api.login(payload);
        pushToast("Login successful");
        setAuthFeedback({
          type: "success",
          message: "Login successful. Your workspace is ready.",
        });
      }
    } catch (error) {
      const message = error?.message || "Authentication failed";
      setAuthFeedback({ type: "error", message });
      pushToast(message);
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-topbar">
        <nav className="landing-topbar-inner">
          <div className="landing-logo">DevSkill Audit</div>
          <div className="landing-links">
            <button type="button" onClick={() => scrollToSection("platform")}>
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("methodology")}
            >
              Methodology
            </button>
            <button type="button" onClick={() => scrollToSection("enterprise")}>
              Enterprise
            </button>
          </div>
          <div className="landing-actions">
            <button
              type="button"
              className="landing-signin-btn"
              onClick={() =>
                setAuthMode((prev) => (prev === "login" ? "signup" : "login"))
              }
            >
              {authMode === "login" ? "Create Account" : "Sign In"}
            </button>
            <button
              type="button"
              className="landing-run-btn"
              onClick={startAuditFlow}
            >
              Run Free Audit
            </button>
          </div>
        </nav>
      </header>

      <main className="landing-main">
        <div className="landing-accent" aria-hidden />

        <section className="landing-hero">
          <div className="landing-beta-pill">
            <span className="landing-pill-dot" />
            <span>Now in Beta for GitHub</span>
          </div>

          <h1 className="landing-headline">
            Analyze your real developer skill from your{" "}
            <span className="landing-code-chip" aria-label="code">
              &lt;code/&gt;
            </span>
          </h1>
          <p>Get actionable insights from your GitHub projects and live apps</p>

          <form className="landing-audit-form" onSubmit={onSubmit}>
            <input
              type="url"
              placeholder="GitHub URL"
              value={auditInput.githubUrl}
              onChange={(e) =>
                setAuditInput((prev) => ({
                  ...prev,
                  githubUrl: e.target.value,
                }))
              }
            />
            <input
              type="url"
              placeholder="Live App (Optional)"
              value={auditInput.liveUrl}
              onChange={(e) =>
                setAuditInput((prev) => ({ ...prev, liveUrl: e.target.value }))
              }
            />
            <button type="submit">
              <span className="material-symbols-outlined">query_stats</span>
              Run Audit
            </button>
          </form>

          <section className="landing-auth-card" aria-label="Account access">
            <div className="landing-auth-head">
              <p>
                {authMode === "signup" ? "Create your account" : "Welcome back"}
              </p>
              <h3>
                {authMode === "signup"
                  ? "Start your skill journey"
                  : "Sign in to continue"}
              </h3>
            </div>

            <form className="landing-auth-form" onSubmit={onAuthSubmit}>
              {authMode === "signup" ? (
                <AuthInput
                  id="name"
                  label="Full name"
                  icon="badge"
                  value={authForm.name}
                  onChange={onAuthFieldChange}
                  onBlur={onAuthFieldBlur}
                  touched={authTouched.name}
                  error={authValidation.errors.name}
                  autoComplete="name"
                  required
                />
              ) : null}

              <AuthInput
                id="email"
                type="email"
                label="Work email"
                icon="mail"
                value={authForm.email}
                onChange={onAuthFieldChange}
                onBlur={onAuthFieldBlur}
                touched={authTouched.email}
                error={authValidation.errors.email}
                autoComplete="email"
                required
              />

              <AuthInput
                id="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                icon="lock"
                value={authForm.password}
                onChange={onAuthFieldChange}
                onBlur={onAuthFieldBlur}
                touched={authTouched.password}
                error={authValidation.errors.password}
                autoComplete={
                  authMode === "signup" ? "new-password" : "current-password"
                }
                required
                showToggle
                isVisible={showPassword}
                onToggle={() => setShowPassword((prev) => !prev)}
              />

              <PasswordStrengthMeter
                password={authForm.password}
                visible={
                  authMode === "signup" ||
                  (authTouched.password && authForm.password.length > 0)
                }
              />

              {authMode === "signup" ? (
                <div className="auth-terms-wrap">
                  <label className="auth-terms">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={authForm.termsAccepted}
                      onChange={onAuthFieldChange}
                      onBlur={onAuthFieldBlur}
                    />
                    <span>
                      I agree to the Terms of Service and Privacy Policy.
                    </span>
                  </label>
                  <p
                    className={`auth-inline-msg ${
                      authTouched.termsAccepted &&
                      authValidation.errors.termsAccepted
                        ? "is-visible"
                        : ""
                    }`}
                  >
                    {authTouched.termsAccepted
                      ? authValidation.errors.termsAccepted
                      : ""}
                  </p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!authCanSubmit}
                className="landing-auth-submit"
                aria-busy={authBusy}
              >
                {authBusy ? (
                  <>
                    <span className="btn-spinner" aria-hidden />
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">person</span>
                    {authMode === "signup" ? "Create account" : "Sign in"}
                  </>
                )}
              </button>
            </form>

            <div className="landing-auth-alt">
              <span>
                {authMode === "signup"
                  ? "Already have an account?"
                  : "New to DevSkill Audit?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode((prev) =>
                    prev === "login" ? "signup" : "login",
                  );
                  setAuthFeedback({ type: "", message: "" });
                }}
              >
                {authMode === "signup" ? "Login" : "Create account"}
              </button>
            </div>

            <div
              className="landing-auth-social"
              aria-label="Social signup options"
            >
              <button type="button" className="social-btn" disabled>
                <span className="material-symbols-outlined">deployed_code</span>
                Continue with GitHub
              </button>
              <button type="button" className="social-btn" disabled>
                <span className="material-symbols-outlined">mail</span>
                Continue with Google
              </button>
            </div>

            <p
              className={`landing-auth-feedback ${
                authFeedback.message ? "is-visible" : ""
              } ${authFeedback.type || ""}`}
              role={authFeedback.type === "error" ? "alert" : "status"}
            >
              {authFeedback.message}
            </p>
          </section>

          <article className="landing-preview-card">
            <div className="landing-preview-glow glow-top" aria-hidden />
            <div className="landing-preview-glow glow-bottom" aria-hidden />

            <div className="landing-preview-shell">
              <header>
                <div>
                  <p>Audit Score</p>
                  <h3>
                    7.2<span>/10</span>
                  </h3>
                </div>
                <span>Intermediate Developer</span>
              </header>

              <div className="landing-preview-body">
                <div className="landing-strength-list">
                  <div>
                    <div className="icon success">
                      <span className="material-symbols-outlined">
                        check_circle
                      </span>
                    </div>
                    <div>
                      <strong>Strength</strong>
                      <p>Consistent commits</p>
                    </div>
                  </div>
                  <div>
                    <div className="icon danger">
                      <span className="material-symbols-outlined">cancel</span>
                    </div>
                    <div>
                      <strong>Weakness</strong>
                      <p>No test coverage</p>
                    </div>
                  </div>
                </div>

                <div className="landing-track">
                  <div>
                    <span>Architecture</span>
                    <span>88%</span>
                  </div>
                  <div className="track-bar">
                    <div />
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section id="platform" className="landing-feature-grid">
          <article className="feature-wide">
            <div>
              <h4>Deep Semantic Code Analysis</h4>
              <p>
                Our engine does not just count lines. It understands patterns,
                naming conventions, and architectural trade-offs in your
                repositories.
              </p>
            </div>
            <div className="feature-chips">
              <span>git log --pretty=format</span>
              <span>ast-parser --strict</span>
            </div>
          </article>

          <article className="feature-card">
            <div className="feature-icon-wrap">
              <span className="material-symbols-outlined">
                shield_with_heart
              </span>
            </div>
            <h4>High Trust Security</h4>
            <p>
              We only read public data or metadata. Your source code stays
              yours.
            </p>
          </article>
        </section>

        <section id="methodology" className="landing-methodology">
          <h3>Methodology Built for Real Engineering Evidence</h3>
          <p>
            Our scoring engine evaluates contribution quality, architecture
            maturity, testing practice, and delivery consistency. You get a
            transparent breakdown of why each score exists and what to improve
            next.
          </p>
          <div className="methodology-points">
            <article>
              <span className="material-symbols-outlined">polyline</span>
              <h4>Signal Capture</h4>
              <p>
                Commit metadata, repo topology, and code patterns are mapped
                into a feature graph.
              </p>
            </article>
            <article>
              <span className="material-symbols-outlined">functions</span>
              <h4>Weighted Scoring</h4>
              <p>
                Each competency dimension is weighted by role-level expectations
                and project context.
              </p>
            </article>
            <article>
              <span className="material-symbols-outlined">map</span>
              <h4>Action Plan</h4>
              <p>
                Findings become milestone-based recommendations with measurable
                execution outcomes.
              </p>
            </article>
          </div>
        </section>

        <section id="enterprise" className="landing-enterprise">
          <div>
            <h3>Enterprise-Grade Team Intelligence</h3>
            <p>
              Compare skill trends across squads, identify coaching priorities,
              and standardize progression frameworks for modern engineering
              teams.
            </p>
          </div>
          <div className="enterprise-metrics">
            <article>
              <strong>120+</strong>
              <span>Teams Benchmarked</span>
            </article>
            <article>
              <strong>38%</strong>
              <span>Average Gap Reduction</span>
            </article>
            <article>
              <strong>99.9%</strong>
              <span>Audit Pipeline Uptime</span>
            </article>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            © 2024 DevSkill Audit. Precision Engineering for Technical Teams.
          </div>
          <div className="landing-footer-links">
            <button
              type="button"
              onClick={() => scrollToSection("methodology")}
            >
              Documentation
            </button>
            <button type="button" onClick={() => scrollToSection("enterprise")}>
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("methodology")}
            >
              Terms of Service
            </button>
            <button type="button" onClick={() => scrollToSection("platform")}>
              Github Status
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingView;
