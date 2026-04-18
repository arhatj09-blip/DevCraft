import { NavLink } from "react-router-dom";

function SideNav() {
  return (
    <aside className="sidenav sovereign-sidenav">
      <div className="sovereign-brand-block">
        <h1 className="brand sovereign-brand">Sovereign Auditor</h1>
        <p className="brand-sub sovereign-brand-sub">Technical Intelligence</p>
      </div>

      <nav className="sidenav-links sovereign-nav-links">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidenav-link sovereign-link ${isActive ? "is-active" : ""}`
          }
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/career-insights"
          className={({ isActive }) =>
            `sidenav-link sovereign-link ${isActive ? "is-active" : ""}`
          }
        >
          <span className="material-symbols-outlined">account_tree</span>
          <span>Project Breakdown</span>
        </NavLink>

        <NavLink
          to="/roadmap"
          className={({ isActive }) =>
            `sidenav-link sovereign-link ${isActive ? "is-active" : ""}`
          }
        >
          <span className="material-symbols-outlined">event_note</span>
          <span>90-Day Roadmap</span>
        </NavLink>
      </nav>

      <div className="sovereign-nav-footer">
        <button type="button" className="sidenav-link sovereign-link muted">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </button>
        <button type="button" className="sidenav-link sovereign-link muted">
          <span className="material-symbols-outlined">help_outline</span>
          <span>Support</span>
        </button>
      </div>
    </aside>
  );
}

export default SideNav;
