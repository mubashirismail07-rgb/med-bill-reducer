import { NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon } from "../components/UI";
export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const context = pathname.startsWith("/bills")
    ? "Bill analysis"
    : pathname === "/login"
      ? "Log in"
      : pathname === "/register"
        ? "Create account"
        : pathname === "/sample"
          ? "Sample workspace"
          : pathname === "/upload"
            ? "Upload bill"
            : pathname === "/history"
              ? "Bill history"
              : "Overview";
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" to={user ? "/dashboard" : "/sample"}>
          <span className="brand-mark">
            m<span>+</span>
          </span>
          <span>
            MedReduce<span className="brand-ai">AI</span>
          </span>
        </Link>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <NavLink to="/dashboard">
            <Icon name="grid" />
            Overview
          </NavLink>
          <NavLink to="/upload">
            <Icon name="upload" />
            Upload bill
          </NavLink>
          <NavLink to="/history">
            <Icon name="history" />
            Bill history
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <Icon />
          <strong>A little clarity goes a long way.</strong>
          <p>Understand your charges. Ask better questions.</p>
          <Link to="/sample">Explore a sample bill →</Link>
        </div>
        <div className="sidebar-footer">
          Built for informed conversations
          <br />
          Not medical or financial advice
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Workspace <span className="divider">/</span>{" "}
            <strong>{context}</strong>
          </span>
          <div className="account">
            {user ? (
              <>
                <span className="avatar">{user.name?.[0] || "M"}</span>
                <span>{user.name}</span>
                <button className="quiet" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Log in</Link>
                <Link className="btn primary small" to="/register">
                  Create account
                </Link>
              </>
            )}
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="page-footer">
          MedReduce AI <span>Clarity before your next conversation.</span>
        </footer>
      </div>
    </div>
  );
}
