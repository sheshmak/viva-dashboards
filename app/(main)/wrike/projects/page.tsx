"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type ProjectStatus = "Green" | "Yellow" | "Red" | "Completed" | "OnHold" | "Cancelled";

interface Project {
  id: string;
  title: string;
  project?: {
    status: ProjectStatus;
    startDate?: string;
    endDate?: string;
    ownerIds: string[];
  };
  permalink: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Green:     { label: "On Track",   color: "#3DD68C", bg: "rgba(61,214,140,.12)" },
  Yellow:    { label: "At Risk",    color: "#FFB020", bg: "rgba(255,176,32,.12)" },
  Red:       { label: "Off Track",  color: "#FF6B6B", bg: "rgba(255,107,107,.12)" },
  Completed: { label: "Completed",  color: "#7CB9FF", bg: "rgba(124,185,255,.12)" },
  OnHold:    { label: "On Hold",    color: "#8892a4", bg: "rgba(136,146,164,.1)" },
  Cancelled: { label: "Cancelled",  color: "#5a6376", bg: "rgba(90,99,118,.1)" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as ProjectStatus[];

export default function WrikeProjectsPage() {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [search, setSearch] = useState("");

  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["wrike-projects"],
    queryFn: async () => {
      const res = await fetch("/api/wrike/projects");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to load projects");
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  const filtered = projects.filter((p) => {
    const matchStatus = statusFilter === "All" || p.project?.status === statusFilter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = projects.filter((p) => p.project?.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const isNotConnected = error?.message === "WRIKE_NOT_CONNECTED";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {isLoading ? "Loading…" : `${projects.length} projects across your Wrike workspace`}
          </p>
        </div>
        <div className="header-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isNotConnected && (
        <div className="not-connected">
          <span>⚠️</span>
          <div>
            <strong>Wrike not connected.</strong>
            <span> Go to <Link href="/admin/connections" style={{color:"#7CB9FF"}}>Admin → Connections</Link> to connect your Wrike account.</span>
          </div>
        </div>
      )}

      {!isNotConnected && (
        <>
          <div className="status-filters">
            <button
              className={`status-chip${statusFilter === "All" ? " status-chip--active" : ""}`}
              onClick={() => setStatusFilter("All")}
            >
              All <span className="chip-count">{projects.length}</span>
            </button>
            {ALL_STATUSES.map((s) => (
              counts[s] > 0 && (
                <button
                  key={s}
                  className={`status-chip${statusFilter === s ? " status-chip--active" : ""}`}
                  style={statusFilter === s ? { borderColor: STATUS_CONFIG[s].color, color: STATUS_CONFIG[s].color } : {}}
                  onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
                >
                  <span className="chip-dot" style={{ background: STATUS_CONFIG[s].color }} />
                  {STATUS_CONFIG[s].label}
                  <span className="chip-count">{counts[s]}</span>
                </button>
              )
            ))}
          </div>

          {isLoading ? (
            <div className="projects-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="project-card project-card--skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">No projects match your filter.</div>
          ) : (
            <div className="projects-grid">
              {filtered.map((p) => {
                const cfg = STATUS_CONFIG[p.project?.status ?? ""] ?? STATUS_CONFIG.OnHold;
                return (
                  <Link key={p.id} href={`/wrike/projects/${p.id}`} className="project-card">
                    <div className="project-card-top">
                      <div className="project-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                        <span className="project-dot" style={{ background: cfg.color }} />
                        {cfg.label}
                      </div>
                    </div>
                    <h3 className="project-name">{p.title}</h3>
                    {p.project?.endDate && (
                      <div className="project-date">
                        Due {new Date(p.project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                    <div className="project-footer">
                      <span className="project-view">View dashboard →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      <style>{`
        .page { padding: 32px 36px; max-width: 1400px; font-family: Inter, system-ui, sans-serif; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
        .page-title { font-size: 24px; font-weight: 700; color: #e2e8f0; margin: 0 0 4px; }
        .page-subtitle { font-size: 13px; color: #64748b; margin: 0; }
        .header-search { display: flex; align-items: center; gap: 8px; background: #1a1f2e; border: 1px solid #2a3044; border-radius: 8px; padding: 8px 14px; }
        .header-search svg { color: #4a5568; flex-shrink: 0; }
        .search-input { background: none; border: none; outline: none; font-size: 14px; color: #e2e8f0; width: 200px; }
        .search-input::placeholder { color: #3a4257; }
        .not-connected { display: flex; align-items: center; gap: 12px; background: rgba(255,176,32,.08); border: 1px solid rgba(255,176,32,.25); border-radius: 10px; padding: 16px 20px; font-size: 14px; color: #94a3b8; margin-bottom: 24px; }
        .status-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
        .status-chip { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; border: 1px solid #2a3044; background: #141824; color: #6b7a99; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.12s; }
        .status-chip:hover { border-color: #4a5568; color: #c8d3e8; }
        .status-chip--active { background: #1e2538; color: #c8d3e8; border-color: #4a5568; }
        .chip-dot { width: 7px; height: 7px; border-radius: 50%; }
        .chip-count { font-size: 11px; color: #4a5568; font-weight: 600; }
        .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .project-card { background: #1a1f2e; border: 1px solid #2a3044; border-radius: 12px; padding: 20px; text-decoration: none; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s, transform 0.12s; cursor: pointer; }
        .project-card:hover { border-color: #4a5568; transform: translateY(-1px); }
        .project-card--skeleton { height: 140px; background: linear-gradient(90deg, #1a1f2e, #1e2538, #1a1f2e); background-size: 200%; animation: shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:200%} 100%{background-position:-200%} }
        .project-card-top { display: flex; align-items: center; justify-content: space-between; }
        .project-status-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; }
        .project-dot { width: 6px; height: 6px; border-radius: 50%; }
        .project-name { font-size: 15px; font-weight: 600; color: #e2e8f0; margin: 0; line-height: 1.4; flex: 1; }
        .project-date { font-size: 12px; color: #64748b; }
        .project-footer { margin-top: auto; }
        .project-view { font-size: 12px; color: #4f6bed; font-weight: 500; }
        .empty { text-align: center; color: #4a5568; font-size: 14px; padding: 60px 0; }
      `}</style>
    </div>
  );
}
