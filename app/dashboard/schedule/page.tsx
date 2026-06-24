"use client";

import { useState, useMemo } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { useGanttData } from "@/hooks/useSchedule";
import { FilterBar } from "./components/FilterBar";
import { GanttView } from "./components/GanttView";
import { SummaryView } from "./components/SummaryView";
import { TaskTableView } from "./components/TaskTableView";
import { ScheduleView, GanttZoom, FilterState, DEFAULT_FILTERS } from "./types";

const VIEWS: { key: ScheduleView; label: string; icon: React.ReactNode }[] = [
  {
    key: "gantt",
    label: "Gantt",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <rect x="3" y="10" width="10" height="3" rx="1.5" />
        <rect x="7" y="15" width="14" height="3" rx="1.5" />
      </svg>
    ),
  },
  {
    key: "summary",
    label: "Summary",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    key: "table",
    label: "Tasks",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
];

export default function SchedulePage() {
  const [view, setView] = useState<ScheduleView>("gantt");
  const [zoom, setZoom] = useState<GanttZoom>("month");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const { data, isLoading, isError, error } = useGanttData();
  const projects  = data?.projects  ?? [];
  const phaseMap  = data?.phaseMap  ?? {};

  const visibleCount = useMemo(() => {
    return projects.filter((p) => {
      if (filters.search && !p.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.pastDueOnly && !p.isOverdue) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
      return true;
    }).length;
  }, [projects, filters]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Topbar */}
      <div className="flex-shrink-0">
        <Topbar title="Schedule" />
      </div>

      {/* View switcher + status */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-2 border-b border-[var(--border)] bg-ground-2">
        <div className="flex items-center gap-1 bg-ground-3 rounded-xl p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: view === v.key ? "var(--ground-2)" : "transparent",
                color: view === v.key ? "#EEF0FF" : "#5A6A94",
                borderBottom: view === v.key ? "2px solid #238636" : "2px solid transparent",
              }}
            >
              <span style={{ color: view === v.key ? "#238636" : "inherit" }}>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-[11px] text-[#5A6A94]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#238636] animate-pulse" />
              Loading from Wrike…
            </div>
          )}
          {!isLoading && !isError && (
            <div className="flex items-center gap-2 text-[11px] text-[#5A6A94]">
              <div className="w-2 h-2 rounded-full bg-[#238636]" />
              Live · {projects.length} projects
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2 text-[11px] text-[#EF4444]">
              <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
              Failed to load Wrike data
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex-shrink-0">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          projectCount={projects.length}
          visibleCount={visibleCount}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full border-2 border-[#238636] border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-[13px] text-[#8B9BC0]">Pulling live data from Wrike…</p>
              <p className="text-[11px] text-[#5A6A94] mt-1">Folder: VIVA Railings · Active Projects</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4 text-[#EF4444]">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-[13px] text-[#EF4444]">Could not connect to Wrike</p>
              <p className="text-[11px] text-[#5A6A94] mt-1 max-w-xs">
                {error instanceof Error ? error.message : "Check your connection and try refreshing"}
              </p>
              <button
                onClick={() => { window.location.href = "/api/connections/wrike/start"; }}
                className="mt-4 px-4 py-2 bg-[#FFB020] hover:bg-[#FFC040] text-[#0F0A00] rounded-lg text-[12px] font-semibold transition-all"
              >
                Reconnect Wrike
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && view === "gantt" && (
          <GanttView
            projects={projects}
            phaseMap={phaseMap}
            filters={filters}
            zoom={zoom}
            onZoomChange={setZoom}
            onFiltersChange={setFilters}
          />
        )}

        {!isLoading && !isError && view === "summary" && (
          <SummaryView projects={projects} filters={filters} />
        )}

        {!isLoading && !isError && view === "table" && (
          <TaskTableView projects={projects} filters={filters} />
        )}
      </div>
    </div>
  );
}
