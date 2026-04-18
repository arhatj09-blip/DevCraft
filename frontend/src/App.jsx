import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import LandingView from "./views/LandingView";
import LoadingView from "./views/LoadingView";
import DashboardView from "./views/DashboardView";
import CareerView from "./views/CareerView";
import RoadmapView from "./views/RoadmapView";
import ResumeView from "./views/ResumeView";

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
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Route>
      </Routes>
    </RouteErrorBoundary>
  );
}

export default App;
