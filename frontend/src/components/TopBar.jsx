import { useLocation } from "react-router-dom";
import { useAppState } from "../state/AppState";

function TopBar() {
  const location = useLocation();
  const { notifications, dismissNotification } = useAppState();
  const isLoading = location.pathname === "/loading";

  return (
    <header className="topbar sovereign-topbar">
      <div className="topbar-left">
        <div className="sovereign-search-wrap">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Audit Terminal v1.0"
            aria-label="Search"
          />
        </div>
      </div>

      <div className="topbar-right">
        <button
          className="icon-button sovereign-icon-button"
          onClick={dismissNotification}
          aria-label="Notifications"
        >
          notifications_none
          {notifications.length > 0 && (
            <span className="badge">{notifications.length}</span>
          )}
        </button>
        <button
          className="icon-button sovereign-icon-button"
          aria-label="Terminal"
        >
          terminal
        </button>

        <div className="user-block sovereign-user-block">
          <div className="user-meta">
            <p>Alex Rivera</p>
            <span>Senior Auditor</span>
          </div>
          <img
            className="avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzXBKzAONrXg2YyIuns1IEmdAHF0k5lLtSTdmdaJfBaOmUjWGhvB6Raszqbf045BnqdA78dzrF9H8tB9NyiKp3dA6c5wts01yfLeqDqr78-sUKTgjbRX0g9P8-xne0sZgQX0BF46pMYDSSlzFtkId-9Dawnc4iSPgrb5yD8AJnAwPHaLQFNrn_oNbpaem4DhQi3thdmek_6nIw4BxtmWWjYkW_GEB-ZsfySm-74kBX1IRT4jvHPpDfBrRSnEQ76O2ShXkETyIdjPe-"
            alt="Senior Auditor"
          />
        </div>
      </div>

      {isLoading && (
        <div className="loading-ribbon">Running deep analysis pipeline...</div>
      )}
    </header>
  );
}

export default TopBar;
