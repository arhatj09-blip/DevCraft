import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import LandingView from "./views/LandingView";
import LoadingView from "./views/LoadingView";
import DashboardView from "./views/DashboardView";
import CareerView from "./views/CareerView";
import RoadmapView from "./views/RoadmapView";
import ResumeView from "./views/ResumeView";
import ErrorPage from "./components/ErrorPage";

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function ErrorRouteView() {
  const [searchParams] = useSearchParams();

  const code = searchParams.get("code")?.trim() || "500";
  const message =
    searchParams.get("message")?.trim() ||
    "We tried to analyze your code, but something went wrong.";
  const showRetry = parseBoolean(searchParams.get("retry"), true);
  const details = searchParams.get("details")?.trim() || undefined;

  return (
    <ErrorPage
      errorCode={code}
      message={message}
      showRetry={showRetry}
      errorDetails={details}
    />
  );
}

function App() {
  return (
    <RouteErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<LandingView />} />
          <Route path="/loading" element={<LoadingView />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/career-insights" element={<CareerView />} />
          <Route path="/roadmap" element={<RoadmapView />} />
          <Route path="/resume-insights" element={<ResumeView />} />
          <Route path="/error" element={<ErrorRouteView />} />
          <Route
            path="*"
            element={
              <ErrorPage
                errorCode="404"
                message="The page you requested was not found in this workspace."
                showRetry={false}
              />
            }
          />
        </Route>
      </Routes>
    </RouteErrorBoundary>
  );
}

export default App;
