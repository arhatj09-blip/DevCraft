import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppState";

function LandingView() {
  const navigate = useNavigate();
  const { auditInput, setAuditInput, pushToast } = useAppState();

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    pushToast("Audit request queued");
    navigate("/loading");
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
              onClick={() => navigate("/loading")}
            >
              Start Audit
            </button>
            <button
              type="button"
              className="landing-run-btn"
              onClick={onSubmit}
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

          <h1>
            Analyze your real developer skill from your <span>code</span>
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
              required
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
