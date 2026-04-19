import { useState } from "react";
import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/audit", label: "Audit" },
    { to: "/results", label: "Results" },
    { to: "/career", label: "Career" },
    { to: "/roadmap", label: "Roadmap" },
    { to: "/history", label: "History" },
  ];

  return (
    <div className="min-h-screen text-slate-700">
      {/* Navigation */}
      <nav className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="dc-shell mt-3 rounded-2xl px-4 h-16 flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white text-sm font-bold grid place-items-center">
                D
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">
                  DevCraft
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Career Intelligence
                </div>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    isActive(item.to)
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden w-9 h-9 rounded-lg border border-slate-300 bg-white text-slate-700"
                aria-label="Open navigation"
              >
                ≡
              </button>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center"
                aria-label="Open profile menu"
              >
                ME
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-52 dc-card p-2 z-50 md:hidden">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive(item.to)
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              {profileOpen && (
                <div className="absolute right-0 top-12 w-52 dc-card p-2 z-50">
                  <Link
                    to="/history"
                    onClick={() => setProfileOpen(false)}
                    className="block px-3 py-2 text-sm rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    Audit History
                  </Link>
                  <Link
                    to="/"
                    onClick={() => setProfileOpen(false)}
                    className="block px-3 py-2 text-sm rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    Start New Audit
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
