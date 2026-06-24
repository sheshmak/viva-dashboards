"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function AppSidebar() {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const isAdmin   = session?.user?.role === "ADMIN";
  const [wrikeOpen, setWrikeOpen] = useState(true);

  function navClass(href: string) {
    const active = href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");
    return `nav-item${active ? " nav-item--active" : ""}`;
  }

  const isWrikeActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">⚡</span>
        <span className="sidebar-logo-text">
          <strong>Viva</strong>
          <span>Dashboards</span>
        </span>
      </div>

      <nav className="sidebar-nav">
        {/* ── Wrike collapsible section ── */}
        <div className="nav-section">
          <button
            className={`nav-group-btn${isWrikeActive ? " nav-group-btn--active" : ""}`}
            onClick={() => setWrikeOpen(o => !o)}
            aria-expanded={wrikeOpen}
          >
            <span className="flex items-center gap-2">
              <span className="app-dot app-dot--wrike" />
              <span>Wrike</span>
            </span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: wrikeOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {wrikeOpen && (
            <div className="nav-sub">
              <Link href="/dashboard" className={navClass("/dashboard")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Consolidated Dashboard
              </Link>
              <Link href="/dashboard/schedule" className={navClass("/dashboard/schedule")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <rect x="3" y="10" width="9" height="3" rx="1.5" />
                  <rect x="6" y="15" width="15" height="3" rx="1.5" />
                </svg>
                Project Schedule
              </Link>
            </div>
          )}
        </div>

        <div className="nav-section nav-section--team">
          <div className="nav-section-label">Team</div>
          <Link href="/admin/users" className={navClass("/admin/users")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Team Onboarding
          </Link>
        </div>

        {isAdmin && (
          <div className="nav-section nav-section--admin">
            <div className="nav-section-label">Admin</div>
            <Link href="/admin/connections" className={navClass("/admin/connections")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Connections
            </Link>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{session?.user?.name}</span>
            <span className="sidebar-user-role">{session?.user?.role ?? "VIEWER"}</span>
          </div>
        </div>
        <button
          className="sidebar-signout"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: 220px;
          min-width: 220px;
          height: 100vh;
          background: #141824;
          border-right: 1px solid #1e2538;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 40;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 20px 18px 16px;
          border-bottom: 1px solid #1e2538;
        }
        .sidebar-logo-icon { font-size: 22px; line-height: 1; }
        .sidebar-logo-text { font-size: 15px; font-weight: 500; color: #e2e8f0; }
        .sidebar-logo-text strong { color: #FFB020; font-weight: 700; }
        .sidebar-nav { flex: 1; overflow-y: auto; padding: 12px 0; }
        .nav-section { padding: 0 10px 16px; }
        .nav-section--team  { border-top: 1px solid #1e2538; padding-top: 16px; }
        .nav-section--admin { border-top: 1px solid #1e2538; padding-top: 16px; }
        .nav-section-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #4a5568;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 8px 8px;
        }
        .nav-group-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 7px 8px;
          border-radius: 7px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          color: #4a5568;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          transition: background 0.12s, color 0.12s;
          margin-bottom: 2px;
        }
        .nav-group-btn:hover { background: #1e2538; color: #8B9BC0; }
        .nav-group-btn--active { color: #7CB9FF; }
        .nav-sub { padding-left: 8px; display: flex; flex-direction: column; gap: 1px; }
        .app-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .app-dot--wrike { background: #4f6bed; }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: 7px;
          font-size: 13.5px;
          color: #6b7a99;
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
          font-weight: 500;
        }
        .nav-item:hover { background: #1e2538; color: #c8d3e8; }
        .nav-item--active { background: rgba(79,107,237,0.15); color: #7CB9FF; }
        .nav-item--active svg { color: #7CB9FF; }
        .sidebar-footer {
          border-top: 1px solid #1e2538;
          padding: 14px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sidebar-user { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; }
        .sidebar-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f6bed, #7CB9FF);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }
        .sidebar-user-info { display: flex; flex-direction: column; min-width: 0; }
        .sidebar-user-name { font-size: 12.5px; color: #c8d3e8; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-user-role { font-size: 10px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.06em; }
        .sidebar-signout {
          background: none;
          border: none;
          color: #4a5568;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: color 0.12s;
          flex-shrink: 0;
        }
        .sidebar-signout:hover { color: #ff6b6b; }
      `}</style>
    </aside>
  );
}
