function RoadmapView() {
  const priorities = [
    {
      id: "1",
      window: "Weeks 1-4",
      title: "Implement Comprehensive Testing",
      why: "Ensures code reliability and prevents regressions in high-velocity CI/CD environments where manual QA is a bottleneck.",
      action:
        "Integrate Jest and achieve 70% coverage on core auth modules using mutation testing for validity.",
      tone: "indigo",
    },
    {
      id: "2",
      window: "Weeks 5-8",
      title: "Master Observability Patterns",
      why: "Reduces Mean Time To Resolution (MTTR) by enabling deep-dive telemetry instead of log-scraping guessing games.",
      action:
        "Implement OpenTelemetry traces across microservices and configure Prometheus alerts for p99 latency spikes.",
      tone: "tertiary",
    },
    {
      id: "3",
      window: "Weeks 9-12",
      title: "Staff-Level Design Review",
      why: "Develops the Sovereign engineering voice needed to influence architecture across multiple autonomous squads.",
      action:
        "Draft and present 3 RFCs addressing technical debt in the legacy payment gateway.",
      tone: "outline",
    },
  ];

  const gaps = [
    { label: "Architectural Design", value: 62, tone: "indigo" },
    { label: "Testing Rigor", value: 38, tone: "error" },
    { label: "Distributed Systems", value: 75, tone: "indigo" },
    { label: "Observability", value: 45, tone: "tertiary" },
  ];

  return (
    <div className="roadmap-page">
      <header className="roadmap-topbar">
        <div className="roadmap-logo">Sovereign Auditor</div>

        <nav className="roadmap-top-links" aria-label="Roadmap navigation">
          <a className="active" href="#roadmap">
            Roadmap
          </a>
          <a href="#matrix">Skill Matrix</a>
          <a href="#logs">Audit Logs</a>
          <a href="#performance">Performance</a>
        </nav>

        <div className="roadmap-top-actions">
          <button type="button" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button type="button" aria-label="Terminal">
            <span className="material-symbols-outlined">terminal</span>
          </button>
          <button type="button" aria-label="Settings">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <img
            alt="User profile avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuASvDoEVS9JVtBvt-8qSSx6O0R3Nj1qoe9XxXf1kqRgA0S6nixWmENGQA10_PRjMoR2HWzBnnx52xzC0tNT4IghHmbk6WBq06oZkoqxCcAk7rQ0lr3VPoZ6d7j-OAdjdOo41v5UlpRrQj300m9lZmWJFd8eCf6ygamqpiDigHP7qQM5llg9iUwxNe02UQljHqTXnjNzpS0NRuyNdz3LVvfF98FhQIwzrwWRxB8vFxhMS45m0VNZVDR6Umu9PkLQ3IxR5vn3v8xjISZC"
          />
        </div>
      </header>

      <aside className="roadmap-sidebar">
        <div className="roadmap-engine-card">
          <div className="engine-icon">
            <span className="material-symbols-outlined">shield</span>
          </div>
          <div>
            <h3>Core Engine</h3>
            <p>Technical Audit v2.4</p>
          </div>
        </div>

        <nav className="roadmap-side-links" aria-label="Sections">
          <a className="active" href="#roadmap">
            <span className="material-symbols-outlined">map</span>
            <span>Roadmap</span>
          </a>
          <a href="#matrix">
            <span className="material-symbols-outlined">architecture</span>
            <span>Skill Matrix</span>
          </a>
          <a href="#logs">
            <span className="material-symbols-outlined">list_alt</span>
            <span>Audit Logs</span>
          </a>
          <a href="#performance">
            <span className="material-symbols-outlined">insights</span>
            <span>Performance</span>
          </a>
        </nav>

        <div className="roadmap-side-footer">
          <button type="button">New Audit</button>
          <a href="#matrix">
            <span className="material-symbols-outlined">menu_book</span>
            <span>Documentation</span>
          </a>
          <a href="#roadmap">
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </a>
        </div>
      </aside>

      <main className="roadmap-main" id="roadmap">
        <header className="roadmap-header">
          <div className="roadmap-header-line">
            <span />
            <small>Audit Intelligence Output</small>
          </div>
          <h1>90-Day Improvement Roadmap</h1>
          <p>
            A strategic path engineered from your recent technical audit. Focus
            on these high-impact gaps to transition from Senior to Staff-level
            engineering proficiency.
          </p>
        </header>

        <section className="roadmap-gap-grid" id="matrix">
          <article className="roadmap-gap-card">
            <span className="material-symbols-outlined ghost">analytics</span>
            <h3>Skill Gap Analysis</h3>
            <div className="gap-bars">
              {gaps.map((item) => (
                <div key={item.label}>
                  <div className="gap-row-head">
                    <span>{item.label}</span>
                    <small className={`tone-${item.tone}`}>
                      {item.value}% Match
                    </small>
                  </div>
                  <div className="gap-track">
                    <i
                      className={`tone-${item.tone}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="roadmap-score-card">
            <div className="score-circle">
              <svg viewBox="0 0 140 140" aria-hidden>
                <circle cx="70" cy="70" r="58" />
                <circle cx="70" cy="70" r="58" className="progress" />
              </svg>
              <div>
                <strong>7.2</strong>
                <span>Audit Score</span>
              </div>
            </div>
            <p>
              Current engineering profile shows high operational excellence but
              lacks formal verification patterns.
            </p>
          </article>
        </section>

        <section className="roadmap-priorities" id="logs">
          <div className="priority-head">
            <h2>Critical Path Priorities</h2>
            <span>Phase: Verification</span>
          </div>

          <div className="priority-grid">
            {priorities.map((item) => (
              <article
                key={item.id}
                className={`priority-card tone-${item.tone}`}
              >
                <div className="priority-top">
                  <strong>{item.id}</strong>
                  <span>{item.window}</span>
                </div>
                <h4>{item.title}</h4>
                <div>
                  <small>Why it Matters</small>
                  <p>{item.why}</p>
                </div>
                <div className="priority-action">
                  <small>Primary Action Step</small>
                  <p>{item.action}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="roadmap-resume" id="performance">
          <div className="resume-head">
            <span className="material-symbols-outlined">description</span>
            <h2>Resume Optimization Strategy</h2>
          </div>

          <div className="resume-rows">
            <article className="resume-row-block tone-indigo">
              <div>
                <small>Current Version</small>
                <p>
                  Responsible for maintaining core backend services and fixing
                  bugs in the user authentication flow.
                </p>
              </div>
              <div>
                <small>Auditor&apos;s Recommendation</small>
                <p>
                  Engineered a resilient Auth architecture that reduced
                  account-takeover incidents by 40% through custom middleware
                  and zero-trust verification.
                </p>
              </div>
            </article>

            <article className="resume-row-block tone-tertiary">
              <div>
                <small>Current Version</small>
                <p>
                  Worked on improving site performance and decreasing load
                  times.
                </p>
              </div>
              <div>
                <small>Auditor&apos;s Recommendation</small>
                <p>
                  Architected a multi-layer caching strategy and optimized p95
                  latency by 250ms, improving Core Web Vitals to 98/100 across
                  mobile surfaces.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="roadmap-timeline">
          <div className="timeline-track">
            <span className="dot start" />
            <span className="dot month1" />
            <span className="dot month2" />
            <span className="dot final" />
            <small className="l-start">Start</small>
            <small className="l-m1">Month 1</small>
            <small className="l-m2">Month 2</small>
            <small className="l-final">Audit V3</small>
          </div>
          <div className="timeline-impact">
            <span>Est. Impact</span>
            <strong>+2.4 pts</strong>
          </div>
        </section>
      </main>

      <nav className="roadmap-mobile-nav" aria-label="Mobile navigation">
        <a className="active" href="#roadmap">
          <span className="material-symbols-outlined">map</span>
          <span>Roadmap</span>
        </a>
        <a href="#matrix">
          <span className="material-symbols-outlined">architecture</span>
          <span>Skills</span>
        </a>
        <a href="#logs">
          <span className="material-symbols-outlined">list_alt</span>
          <span>Logs</span>
        </a>
        <a href="#performance">
          <span className="material-symbols-outlined">insights</span>
          <span>Data</span>
        </a>
      </nav>
    </div>
  );
}

export default RoadmapView;
