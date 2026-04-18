function ResumeView() {
  return (
    <div className="resume-insights-page">
      <aside className="resume-insights-side">
        <div className="resume-insights-side-inner">
          <div className="resume-insights-brand">
            <h1>Sovereign Auditor</h1>
            <p>Precision Resume Engine</p>
          </div>

          <nav className="resume-insights-menu" aria-label="Main navigation">
            <a href="#">
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </a>
            <a href="#" className="active">
              <span className="material-symbols-outlined">description</span>
              <span>Resume Audit</span>
            </a>
            <a href="#">
              <span className="material-symbols-outlined">alt_route</span>
              <span>Roadmap</span>
            </a>
            <a href="#">
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </a>
          </nav>

          <div className="resume-insights-side-cta">
            <button type="button">New Audit</button>
          </div>
        </div>
      </aside>

      <main className="resume-insights-main">
        <header className="resume-insights-topbar">
          <div className="resume-insights-top-left">
            <span className="title">Resume Insights</span>
            <nav aria-label="Resume sections">
              <a href="#">Overview</a>
              <a href="#" className="active">
                Comparisons
              </a>
              <a href="#">History</a>
            </nav>
          </div>

          <div className="resume-insights-top-right">
            <div className="resume-insights-search">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Audit history..." />
            </div>
            <button type="button" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button type="button" aria-label="Help">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <img
              alt="User Avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBErkt-b4_DFQmYnBz8sfRqQcv5paDgZ7UV_LsW--Kxx11pbnIG_OSeLahPq9ESsc-wgofb-nbKpaXiq0f5MHX8Jpjw-zdOtkEDjUoWTOBWsYvbXb6AVSv7i1qG_2CHLfrx0udOmTqTBp1-sz3nguNTaBDmnEANgUIItJeUlMFKM6J5Rgd97pdddd-22XK0HiEJm_fLuJmUYKhrmOrW-xRAkqZqFv-6G-lTaxW7Hh0RVlmuT-V4XZ5sNOfs-sCUPGndQZscN1oLt-TF"
            />
          </div>
        </header>

        <div className="resume-insights-content">
          <section className="resume-insights-hero">
            <p>Audit Phase 03</p>
            <h2>Strategic Project Selection</h2>
            <span>
              Based on deep code analysis of your repositories, we identified
              the projects that showcase your maximum technical leverage.
            </span>
          </section>

          <section className="resume-insights-grid">
            <article className="projects-highlight">
              <header>
                <h3>
                  <span className="material-symbols-outlined">verified</span>
                  Highlight These Projects
                </h3>
              </header>

              <div className="project-cards">
                <article>
                  <div className="project-head">
                    <div>
                      <h4>Nexus-DB Engine</h4>
                      <div className="tags">
                        <span>C++</span>
                        <span>Low-Latency</span>
                      </div>
                    </div>
                    <div className="score">94</div>
                  </div>
                  <ul>
                    <li>
                      <span className="material-symbols-outlined">
                        check_circle
                      </span>
                      <p>
                        <strong>Excellent architectural modularity:</strong>
                        Separation of storage and execution layers demonstrates
                        senior-level system design.
                      </p>
                    </li>
                    <li>
                      <span className="material-symbols-outlined">
                        check_circle
                      </span>
                      <p>
                        <strong>85% Test Coverage:</strong>
                        High reliability score in edge-case handling for
                        concurrent data writes.
                      </p>
                    </li>
                  </ul>
                </article>

                <article>
                  <div className="project-head">
                    <div>
                      <h4>Prism-UI Design System</h4>
                      <div className="tags">
                        <span>React</span>
                        <span>A11y</span>
                      </div>
                    </div>
                    <div className="score">88</div>
                  </div>
                  <ul>
                    <li>
                      <span className="material-symbols-outlined">
                        check_circle
                      </span>
                      <p>
                        <strong>Atomic Structure:</strong>
                        Proper implementation of design tokens and reusable
                        component logic.
                      </p>
                    </li>
                  </ul>
                </article>
              </div>
            </article>

            <article className="projects-risks">
              <h3>
                <span className="material-symbols-outlined">report</span>
                Improve or Remove
              </h3>

              <div className="risk-list">
                <div className="risk-card tone-error">
                  <div>
                    <span className="material-symbols-outlined">
                      delete_forever
                    </span>
                    <div>
                      <p>Weather App 2021</p>
                      <small>Stale dependencies (High CVE risk)</small>
                    </div>
                  </div>
                  <button type="button">Archive</button>
                </div>

                <div className="risk-card tone-warning">
                  <div>
                    <span className="material-symbols-outlined">warning</span>
                    <div>
                      <p>Legacy Auth Wrapper</p>
                      <small>
                        High cyclomatic complexity (Complexity Score: 42)
                      </small>
                    </div>
                  </div>
                  <button type="button">Refactor</button>
                </div>
              </div>

              <div className="insight-chart">
                <small>Impact Score Visualizer</small>
                <div className="bars" aria-hidden>
                  <i style={{ height: "30%" }} />
                  <i style={{ height: "45%" }} />
                  <i style={{ height: "70%" }} />
                  <i style={{ height: "95%" }} />
                  <i className="error" style={{ height: "40%" }} />
                </div>
                <p>
                  Your current projects are skewed towards
                  <strong> Front-end Heavy</strong>. Balance with 1-2 more
                  system-design focused repositories.
                </p>
              </div>
            </article>
          </section>

          <section className="bullet-optimizer">
            <header>
              <div>
                <h2>Bullet Point Optimization</h2>
                <p>
                  Reframing tasks as measurable business and technical impact.
                </p>
              </div>
              <button type="button">
                <span className="material-symbols-outlined">auto_fix_high</span>
                Auto-Rewrite All
              </button>
            </header>

            <div className="compare-cards">
              <article>
                <div className="before">
                  <small>Before</small>
                  <p>
                    <span className="material-symbols-outlined">history</span>
                    Built a website using React
                  </p>
                </div>
                <div className="connector">
                  <span className="material-symbols-outlined">
                    trending_flat
                  </span>
                </div>
                <div className="after">
                  <small>Optimized</small>
                  <p>
                    <span className="material-symbols-outlined">
                      check_circle
                    </span>
                    Developed a responsive <strong>React application</strong>{" "}
                    with optimized component structure and
                    <strong> reusable UI modules</strong>
                  </p>
                </div>
              </article>

              <article>
                <div className="before">
                  <small>Before</small>
                  <p>
                    <span className="material-symbols-outlined">history</span>
                    Fixed bugs in API
                  </p>
                </div>
                <div className="connector">
                  <span className="material-symbols-outlined">
                    trending_flat
                  </span>
                </div>
                <div className="after">
                  <small>Optimized</small>
                  <p>
                    <span className="material-symbols-outlined">
                      check_circle
                    </span>
                    Refactored legacy authentication logic to implement
                    <strong> JWT best practices</strong>, reducing security
                    vulnerabilities by <strong>40%</strong>
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section className="resume-summary">
            <div className="summary-left">
              <div className="summary-ring">
                <svg viewBox="0 0 90 90" aria-hidden>
                  <circle cx="45" cy="45" r="36" />
                  <circle cx="45" cy="45" r="36" className="progress" />
                </svg>
                <span>82%</span>
              </div>

              <div>
                <h4>Insight Score Confidence</h4>
                <p>Analysis completed across 14 connected repositories.</p>
              </div>
            </div>

            <div className="summary-actions">
              <button type="button" className="secondary">
                Download PDF Report
              </button>
              <button type="button" className="primary">
                Update Resume
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ResumeView;
