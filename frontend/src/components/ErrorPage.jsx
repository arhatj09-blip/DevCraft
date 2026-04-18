import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function ErrorGlyph() {
  return (
    <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
      <div
        className="absolute inset-0 rounded-3xl bg-sky-500/20 blur-2xl"
        aria-hidden
      />
      <div
        className="absolute inset-2 animate-pulse rounded-2xl border border-slate-300/30 bg-slate-900/70"
        aria-hidden
      />
      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200/20 bg-slate-950/80 shadow-2xl">
        <span className="font-mono text-xl font-semibold tracking-wide text-sky-300">
          {"</>"}
        </span>
      </div>
      <span
        className="absolute -right-1 -top-1 h-3 w-3 animate-bounce rounded-full bg-rose-400"
        aria-hidden
      />
      <span
        className="absolute -bottom-1 -left-1 h-2 w-2 animate-pulse rounded-full bg-amber-300"
        aria-hidden
      />
    </div>
  );
}

export default function ErrorPage({
  errorCode = "500",
  message,
  showRetry = true,
  onRetry,
  errorDetails,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [entered, setEntered] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handle = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(handle);
  }, []);

  const normalizedCode = String(errorCode || "500");
  const isNotFound = normalizedCode === "404";

  const headline = isNotFound
    ? "This route does not exist in your career graph."
    : "Something broke. Even great code has bugs.";

  const body =
    message ||
    (isNotFound
      ? "The page may have moved, or the URL may be invalid."
      : "We tried to analyze your code, but something went wrong before we could finish.");

  const debugPayload = useMemo(() => {
    if (errorDetails) return errorDetails;
    const stateDetails = location.state?.errorDetails;
    if (stateDetails) return stateDetails;
    return null;
  }, [errorDetails, location.state]);

  const debugText = useMemo(() => {
    if (!debugPayload) return "";
    if (typeof debugPayload === "string") return debugPayload;
    if (debugPayload instanceof Error) {
      return `${debugPayload.name}: ${debugPayload.message}`;
    }
    try {
      return JSON.stringify(debugPayload, null, 2);
    } catch {
      return String(debugPayload);
    }
  }, [debugPayload]);

  const showDebug = import.meta.env.DEV && Boolean(debugText);

  const suggestions = [
    "Invalid GitHub link or unsupported repository format",
    "Server timeout while collecting analysis data",
    "Temporary API failure from an external service",
  ];

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }

    if (location.pathname === "/loading") {
      navigate(0);
      return;
    }

    if (location.search) {
      navigate(`/loading${location.search}`);
      return;
    }

    navigate("/landing");
  };

  const handleCopy = async () => {
    if (!debugText) return;
    await navigator.clipboard.writeText(debugText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
      <section
        className={`mx-auto w-full max-w-3xl rounded-3xl border border-slate-700/60 bg-slate-900/65 p-6 shadow-2xl backdrop-blur md:p-10 ${
          entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        } transition-all duration-500`}
        aria-labelledby="error-title"
      >
        <ErrorGlyph />

        <div className="text-center">
          <p
            className="font-mono text-6xl font-bold tracking-tighter text-slate-200 md:text-7xl"
            aria-label={`Error ${normalizedCode}`}
          >
            {normalizedCode}
          </p>
          <h1
            id="error-title"
            className="mt-3 text-balance text-2xl font-semibold text-white md:text-3xl"
          >
            {headline}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-slate-300 md:text-base">
            {body}
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-slate-700/60 bg-slate-950/50 p-4 md:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Possible reasons
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {suggestions.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {showDebug ? (
          <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Debug details
              </h2>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-sky-300 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                {copied ? "Copied" : "Copy error details"}
              </button>
            </div>
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">
              {debugText}
            </pre>
          </div>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Go to Dashboard
          </button>
          {showRetry ? (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              Retry Analysis
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
