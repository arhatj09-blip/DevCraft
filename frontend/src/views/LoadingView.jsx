import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function LoadingView() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(20);
  const [activeStep, setActiveStep] = useState(2);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.floor(Math.random() * 10), 100);
        if (next > 36) {
          setActiveStep(3);
        }
        if (next > 72) {
          setActiveStep(4);
        }
        if (next > 92) {
          setActiveStep(5);
        }
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => navigate("/dashboard"), 600);
        }
        return next;
      });
    }, 420);

    return () => window.clearInterval(timer);
  }, [navigate]);

  return (
    <div className="loading-immersive">
      <div className="loading-ornaments" aria-hidden>
        <div className="loading-orb orb-a" />
        <div className="loading-orb orb-b" />
        <div className="loading-shimmer" />
      </div>

      <main className="loading-canvas">
        <header className="loading-brand">
          <div className="loading-brand-row">
            <span className="material-symbols-outlined loading-brand-icon">
              shield_with_heart
            </span>
            <h1>
              DEVSKILL <span>AUDIT</span>
            </h1>
          </div>
          <p>System Version 4.0.2 // Engine: Sovereign</p>
        </header>

        <section className="loading-module">
          <div className="loading-progress-head">
            <span>ANALYSIS STATUS</span>
            <strong>{progress}% COMPLETE</strong>
          </div>

          <div
            className="loading-progress-track"
            role="progressbar"
            aria-valuenow={progress}
          >
            <div
              className="loading-progress-fill"
              style={{ width: `${progress}%` }}
            >
              <div className="loading-progress-stripe" />
            </div>
          </div>

          <p className="loading-subtext">
            Analyzing real-world code signals...
          </p>

          <div className="loading-steps">
            <article
              className={`loading-step ${activeStep >= 1 ? "done" : ""}`}
            >
              <span className="material-symbols-outlined">check</span>
              <div>
                <h3>Fetching repositories</h3>
                <p>Success // 12 Repos Indexed</p>
              </div>
            </article>

            <article
              className={`loading-step ${activeStep >= 2 ? "done" : ""}`}
            >
              <span className="material-symbols-outlined">check</span>
              <div>
                <h3>Analyzing code structure</h3>
                <p>Parsing Complete</p>
              </div>
            </article>

            <article
              className={`loading-step ${activeStep === 3 ? "active" : ""}`}
            >
              <span className="material-symbols-outlined">sync</span>
              <div>
                <h3>Detecting patterns &amp; issues</h3>
                <p>Processing Logic Blocks...</p>
              </div>
            </article>

            <article
              className={`loading-step ${activeStep >= 4 ? "active" : "pending"}`}
            >
              <span className="material-symbols-outlined">hourglass_empty</span>
              <div>
                <h3>Running UI &amp; performance audit</h3>
                <p>Waiting...</p>
              </div>
            </article>

            <article
              className={`loading-step ${activeStep >= 5 ? "active" : "pending"}`}
            >
              <span className="material-symbols-outlined">
                bar_chart_4_bars
              </span>
              <div>
                <h3>Generating insights</h3>
                <p>Finalizing Report</p>
              </div>
            </article>
          </div>
        </section>

        <footer className="loading-meta">
          <div>
            <small>Connection</small>
            <strong>ENCRYPTED_SSL</strong>
          </div>
          <div>
            <small>Latency</small>
            <strong>14ms</strong>
          </div>
          <div>
            <small>Engine</small>
            <strong>NODE_V21</strong>
          </div>
        </footer>
      </main>

      <div
        className="loading-texture"
        aria-hidden
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAPkQ2HQMw5qoOulMw7RBuO_MYVQ6dNnIRAiuIBohESIiYQHpVCMNqvFszOxMi8phYkLJ20IpMLYlFfueE7Gn3oZcgYJGXTG12idgOP4J4en-JqfCk0WBWVu5PEbORLaytftEQ3LmlNxO96ESMQQxR1sTVvpul5laczhnekO3l_ALL5C5a_KIW6Is67VC1hzeCD9dgp8d8BR2Naw8Lj0mV9xvja7DiCePvPp9RmnomokJ7e8ryl_8WWdmmPMgNQ4QZnUS0JmreuomEU')",
        }}
      />
    </div>
  );
}

export default LoadingView;
