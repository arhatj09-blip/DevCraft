import { Outlet, useLocation } from "react-router-dom";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import { useAppState } from "../state/AppState";

function AppLayout() {
  const { toast } = useAppState();
  const location = useLocation();
  const isImmersiveView = [
    "/landing",
    "/loading",
    "/roadmap",
    "/resume-insights",
  ].includes(location.pathname);

  if (isImmersiveView) {
    return (
      <div className="app-shell loading-shell-only">
        <div className="app-main loading-main-only">
          <section className="page-body loading-page-body">
            <Outlet />
          </section>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <SideNav />
      <div className="app-main">
        <TopBar />
        <section className="page-body">
          <Outlet />
        </section>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default AppLayout;
