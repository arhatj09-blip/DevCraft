import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { mapApiErrorToRoute, toErrorRoute } from "../utils/errorRoute";

function DashboardView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const jobId = searchParams.get("jobId");

  useEffect(() => {
    let stopped = false;

    async function loadResult() {
      if (!jobId) {
        navigate(
          toErrorRoute({
            code: 400,
            message:
              "Missing audit job ID. Start an audit from the landing page.",
            retry: false,
          }),
          { replace: true },
        );
        return;
      }

      try {
        const result = await api.getAuditResult(jobId);
        if (!stopped) {
          setReport(result);
          setError("");
        }
      } catch (apiError) {
        if (!stopped) {
          navigate(
            mapApiErrorToRoute(apiError, "Failed to load dashboard result", {
              retry: false,
            }),
            { replace: true },
          );
        }
      } finally {
        if (!stopped) {
          setLoading(false);
        }
      }
    }

    void loadResult();

    return () => {
      stopped = true;
    };
  }, [jobId, navigate]);

  const computed = useMemo(() => {
    const score = report?.summary?.score ?? 7.2;
    const level = report?.summary?.level ?? "Intermediate";
    const verdict =
      report?.summary?.verdict ||
      "Strong frontend architecture, but critical gaps in backend security and testing.";
    const strengths = report?.strengths ?? [];
    const weaknesses = report?.weaknesses ?? [];
    return {
      score,
      level,
      verdict,
      strengths,
      weaknesses,
    };
  }, [report]);

  return (
    <div className="sovereign-dashboard">
      <section className="sovereign-hero-grid">
        <div className="sovereign-hero-copy">
          <span className="sovereign-tag">Candidate Audit Report</span>
          <h2>
            Strong <span>{computed.level}</span>
          </h2>
          <p>{computed.verdict}</p>
          <div className="sovereign-hero-actions">
            <button type="button" className="sovereign-btn-primary">
              Generate PDF Report
            </button>
            <button type="button" className="sovereign-btn-secondary">
              Compare Benchmarks
            </button>
          </div>
        </div>

        <div className="sovereign-score-wrap">
          <div className="sovereign-score-ring" aria-hidden />
          <div className="sovereign-score-inner">
            <strong>{computed.score}</strong>
            <span>Aggregate Score</span>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="panel">
          <p>Loading dashboard data...</p>
        </section>
      ) : null}

      {error ? (
        <section className="panel">
          <p>{error}</p>
        </section>
      ) : null}

      <section className="sovereign-bento-grid">
        <article className="sovereign-card strengths">
          <div className="sovereign-card-head">
            <h3>Engineering Strengths</h3>
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <div className="sovereign-bullets">
            {computed.strengths.length > 0
              ? computed.strengths.slice(0, 3).map((strength) => (
                  <div key={strength.title}>
                    <span />
                    <div>
                      <p>{strength.title}</p>
                      <small>{strength.evidence}</small>
                    </div>
                  </div>
                ))
              : null}
          </div>
        </article>

        <article className="sovereign-card weaknesses">
          <div className="sovereign-card-head">
            <h3>Critical Deficiencies</h3>
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div className="sovereign-risks">
            {computed.weaknesses.length > 0
              ? computed.weaknesses.slice(0, 2).map((weakness) => (
                  <div key={weakness.title}>
                    <p>
                      {weakness.title}{" "}
                      <em>{(weakness.priority || "high").toUpperCase()}</em>
                    </p>
                    <small>{weakness.whyItMatters}</small>
                  </div>
                ))
              : null}
          </div>
        </article>
      </section>

      <section className="sovereign-breakdown">
        <h3>
          Repository Analysis <span />
        </h3>
        <div className="sovereign-repo-grid">
          <article>
            <div className="repo-head">
              <div>
                <h4>core-auth-service</h4>
                <p>Node.js / Redis / Postgres</p>
              </div>
              <strong className="risk">4.8</strong>
            </div>
            <ul>
              <li>
                <span className="material-symbols-outlined">close</span>
                Exposed secret keys in environment template
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Optimized SQL queries for high-volume login
              </li>
            </ul>
          </article>

          <article>
            <div className="repo-head">
              <div>
                <h4>payment-gateway</h4>
                <p>Go / gRPC / Stripe API</p>
              </div>
              <strong className="good">8.9</strong>
            </div>
            <ul>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Idempotency keys implemented correctly
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Strict error handling for partial failures
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="sovereign-insight-grid">
        <div className="insight-cards">
          <article>
            <div>
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <h5>High Cyclomatic Complexity</h5>
            <p>
              Nested conditionals in the validation engine exceed threshold
              (Max: 12, Found: 18).
            </p>
          </article>

          <article>
            <div className="warn">
              <span className="material-symbols-outlined">difference</span>
            </div>
            <h5>Duplicate Logic Found</h5>
            <p>
              Shared utility logic for date parsing duplicated across 4
              microservices.
            </p>
          </article>
        </div>

        <aside className="sovereign-live">
          <h3>Live App Analysis</h3>
          <div className="live-row">
            <div>
              <span>Performance</span>
              <strong>85%</strong>
            </div>
            <div className="live-bar">
              <i style={{ width: "85%" }} />
            </div>
          </div>
          <div className="live-row">
            <div>
              <span>Accessibility</span>
              <strong>92%</strong>
            </div>
            <div className="live-bar">
              <i style={{ width: "92%" }} />
            </div>
          </div>
          <div className="live-row">
            <div>
              <span>Load Time</span>
              <strong>1.2s</strong>
            </div>
            <div className="live-bar">
              <i className="dim" style={{ width: "70%" }} />
            </div>
            <small>Target: &lt; 0.8s</small>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default DashboardView;
