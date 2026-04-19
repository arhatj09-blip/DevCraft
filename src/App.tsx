import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./layouts/Layout";
import { LandingPage } from "./pages/LandingPage";
import { AuditPage } from "./pages/AuditPage";
import { ResultsPage } from "./pages/ResultsPage";
import { CareerInsightsPage } from "./pages/CareerPage";
import { RoadmapPage } from "./pages/RoadmapPage";
import { HistoryPage } from "./pages/HistoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./App.css";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/career" element={<CareerInsightsPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
