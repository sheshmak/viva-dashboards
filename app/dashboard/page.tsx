"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useGanttData } from "@/hooks/useSchedule";
import { Topbar } from "@/components/dashboard/Topbar";
import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase } from "@/lib/wrike";
import {
  DEPT_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  type GanttZoom,
} from "@/app/dashboard/schedule/types";

// ─── Date helpers ────────────────────────────────────────────────────────────────
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}
function addDays(s: string, n: number): string {
  const d = parseDate(s); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function addMonths(s: string, n: number): string {
  const d = parseDate(s); d.setMonth(d.getMonth() + n); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function fmtDate(s: string): string {
  if (!s) return "—";
  return parseDate(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtYM(s: string): string {
  if (!s) return "—";
  return parseDate(s).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Constants ───────────────────────────────────────────────────────────────────
const ROW_H    = 72;
const BAR_H    = 16;
const BAR_GAP  = 4;
const LEFT_W   = 268;
const HEADER_H = 50;

const PX_PER_DAY: Record<GanttZoom, number> = {
  week: 40, month: 10, quarter: 3.5, year: 1.8, "12months": 2.8,
};
const ZOOM_LABELS: Record<GanttZoom, string> = {
  week: "Week", month: "Month", quarter: "Quarter", year: "Year", "12months": "12 Mo",
};

// Sorts critical → stable → done
const STATUS_ORDER: Record<string, number> = {
  Red: 0, Yellow: 1, Green: 2, OnHold: 3, Cancelled: 4, Completed: 5,
};

const STATUSES = ["Green", "Yellow", "Red", "Completed", "OnHold", "Cancelled"] as const;
const DEPTS    = ["Design & Engineering", "Fabrication", "Install"] as const;

// ─── Filter state ────────────────────────────────────────────────────────────────
interface Filters {
  search:      string;
  statuses:    string[];
  departments: string[];
  pastDueOnly: boolean;
}
const EMPTY_FILTERS: Filters = { search: "", statuses: [], departments: [], pastDueOnly: false };

// ─── Status badge ─────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#6B7280";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0"
      style={{ background: color + "22", color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── KPI strip ───────────────────────────────────────────────────────────────────
function KPIStrip({ projects }: { projects: ScheduleProject[] }) {
  const stats = [
    { label: "Total",      value: projects.length,                                          color: "#8B9BC0" },
    { label: "On Track",   value: projects.filter(p => p.status === "Green").length,        color: "#238636" },
    { label: "At Risk",    value: projects.filter(p => p.status === "Yellow").length,       color: "#D97706" },
    { label: "Off Track",  value: projects.filter(p => p.status === "Red").length,          color: "#EF4444" },
    { label: "Overdue",    value: projects.filter(p => p.isOverdue).length,                 color: "#EF4444" },
    { label: "Completed",  value: projects.filter(p => p.status === "Completed").length,    color: "#3B82F6" },
    { label: "On Hold",    value: projects.filter(p => p.status === "OnHold").length,       color: "#6B7280" },
  ];
  return (
    <div className="flex items-center gap-1 px-6 py-2.5 border-b border-[var(--border)] bg-ground-2 flex-shrink-0 flex-wrap">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          {i > 0 && <span className="text-[#2A3348] select-none">·</span>}
          <span className="text-[13px] font-bold tabular-nums" style={{ color: s.color }}>
            {s.value}
          </span>
          <span className="text-[10px] text-[#5A6A94] uppercase tracking-wide">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Filter / view toolbar ────────────────────────────────────────────────────────
function FilterToolbar({
  filters, onFilters,
  view, onView,
  zoom, onZoom,
  total, visible,
}: {
  filters: Filters; onFilters: (f: Filters) => void;
  view: "gantt" | "portfolio"; onView: (v: "gantt" | "portfolio") => void;
  zoom: GanttZoom; onZoom: (z: GanttZoom) => void;
  total: number; visible: number;
}) {
  const hasActive =
    filters.statuses.length > 0 || filters.departments.length > 0 ||
    !!filters.search || filters.pastDueOnly;

  return (
    <div className="flex flex-col border-b border-[var(--border)] bg-ground-2 flex-shrink-0">
      {/* Row 1: controls */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] flex-wrap">
        {/* View switcher */}
        <div className="flex bg-ground-3 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
          {(["gantt", "portfolio"] as const).map(v => (
            <button key={v} onClick={() => onView(v)}
              className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
              style={{ background: view === v ? "#1E4620" : "transparent", color: view === v ? "#3DD68C" : "#5A6A94" }}
            >
              {v === "gantt" ? (
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <rect x="3" y="10" width="9" height="3" rx="1.5" />
                    <rect x="6" y="15" width="15" height="3" rx="1.5" />
                  </svg>
                  Gantt
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  Portfolio
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-[300px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6A94] pointer-events-none"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" placeholder="Search by project # or name…"
            value={filters.search}
            onChange={e => onFilters({ ...filters, search: e.target.value })}
            className="w-full bg-ground-3 border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[#EEF0FF] placeholder:text-[#5A6A94] focus:outline-none focus:border-[#4B9EFF]"
          />
        </div>

        {/* Past due toggle */}
        <button
          onClick={() => onFilters({ ...filters, pastDueOnly: !filters.pastDueOnly })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all flex-shrink-0"
          style={{
            background: filters.pastDueOnly ? "rgba(239,68,68,0.12)" : "transparent",
            borderColor: filters.pastDueOnly ? "#EF4444" : "var(--border)",
            color: filters.pastDueOnly ? "#EF4444" : "#5A6A94",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Overdue
        </button>

        {/* Zoom — gantt only */}
        {view === "gantt" && (
          <div className="flex bg-ground-3 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
            {(Object.keys(ZOOM_LABELS) as GanttZoom[]).map(z => (
              <button key={z} onClick={() => onZoom(z)}
                className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all"
                style={{
                  background: zoom === z ? "rgba(255,255,255,0.08)" : "transparent",
                  color:      zoom === z ? "#EEF0FF" : "#5A6A94",
                }}
              >
                {ZOOM_LABELS[z]}
              </button>
            ))}
          </div>
        )}

        {/* Count */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <span className="text-[13px] font-bold text-[#EEF0FF]">{visible}</span>
          <span className="text-[11px] text-[#5A6A94]">of {total} projects</span>
        </div>
      </div>

      {/* Row 2: status + dept filter pills */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <span className="text-[10px] text-[#5A6A94] uppercase tracking-wider font-semibold mr-1">Status</span>
        {STATUSES.map(s => {
          const active = filters.statuses.includes(s);
          const color = STATUS_COLORS[s] ?? "#6B7280";
          return (
            <button key={s}
              onClick={() => onFilters({ ...filters, statuses: active ? filters.statuses.filter(x => x !== s) : [...filters.statuses, s] })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
              style={{
                background: active ? color + "22" : "transparent",
                borderColor: active ? color + "80" : "var(--border)",
                color: active ? color : "#8B9BC0",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? color : "#5A6A94" }} />
              {STATUS_LABELS[s] ?? s}
            </button>
          );
        })}

        <span className="text-[#2A3348] mx-1 select-none">|</span>
        <span className="text-[10px] text-[#5A6A94] uppercase tracking-wider font-semibold mr-1">Dept</span>
        {DEPTS.map(d => {
          const active = filters.departments.includes(d);
          const color = DEPT_COLORS[d];
          return (
            <button key={d}
              onClick={() => onFilters({ ...filters, departments: active ? filters.departments.filter(x => x !== d) : [...filters.departments, d] })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
              style={{
                background: active ? color + "22" : "transparent",
                borderColor: active ? color + "80" : "var(--border)",
                color: active ? color : "#8B9BC0",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: active ? color : "#5A6A94" }} />
              {d === "Design & Engineering" ? "D&E" : d}
            </button>
          );
        })}

        {hasActive && (
          <button onClick={() => onFilters(EMPTY_FILTERS)}
            className="ml-auto text-[10px] text-[#5A6A94] hover:text-[#EF4444] transition-colors flex items-center gap-1"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Drill-down panel ─────────────────────────────────────────────────────────────
function DrillDownPanel({
  project, phases, onClose,
}: {
  project: ScheduleProject;
  phases: DepartmentPhase[];
  onClose: () => void;
}) {
  const statusColor = STATUS_COLORS[project.status] ?? "#6B7280";
  const today = todayStr();
  const daysLeft = project.endDate ? daysBetween(today, project.endDate) : null;

  return (
    <div
      className="fixed right-0 top-0 bottom-0 flex flex-col z-50"
      style={{ width: 360, background: "var(--ground-2)", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,0.45)" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-5 border-b border-[var(--border)]" style={{ borderTop: `3px solid ${statusColor}` }}>
        <div className="flex-1 min-w-0">
          <div className="text-[24px] font-black text-[#4B9EFF] leading-none mb-1.5 font-mono">
            {project.number || "—"}
          </div>
          <div className="text-[12px] text-[#C8D0E8] leading-snug">
            {project.name || project.title}
          </div>
        </div>
        <button onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-[#5A6A94] hover:text-[#EEF0FF] hover:bg-ground-3 transition-all"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Status + dates */}
      <div className="p-5 border-b border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={project.status} />
          {project.isOverdue && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(239,68,68,0.15)] text-[#EF4444] uppercase">
              Overdue
            </span>
          )}
          {project.risk && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ground-3 text-[#8B9BC0]">
              {project.risk}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-[#5A6A94] uppercase tracking-wider mb-1 font-semibold">Start</div>
            <div className="text-[13px] text-[#C8D0E8]">{fmtDate(project.startDate)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#5A6A94] uppercase tracking-wider mb-1 font-semibold">End</div>
            <div className="text-[13px] text-[#C8D0E8]">{fmtDate(project.endDate)}</div>
          </div>
        </div>

        {daysLeft !== null && project.status !== "Completed" && project.status !== "Cancelled" && (
          <div
            className="text-[12px] font-bold"
            style={{ color: daysLeft < 0 ? "#EF4444" : daysLeft < 30 ? "#D97706" : "#238636" }}
          >
            {daysLeft < 0
              ? `${Math.abs(daysLeft)} days overdue`
              : daysLeft === 0 ? "Due today"
              : `${daysLeft} days remaining`}
          </div>
        )}
      </div>

      {/* Phases */}
      <div className="p-5 flex-1 overflow-y-auto">
        <div className="text-[10px] text-[#5A6A94] uppercase tracking-wider font-semibold mb-4">
          Department Phases
        </div>
        {phases.length === 0 ? (
          <div className="text-[12px] text-[#5A6A94]">No department phases found for this project.</div>
        ) : (
          <div className="space-y-4">
            {phases.map(ph => {
              const color = DEPT_COLORS[ph.department];
              const isPhaseOverdue = ph.end < today && ph.status !== "completed";
              const phStart = parseDate(ph.start).getTime();
              const phEnd   = parseDate(ph.end).getTime();
              const phNow   = parseDate(today).getTime();
              const progress = phEnd > phStart
                ? Math.max(0, Math.min(1, (phNow - phStart) / (phEnd - phStart)))
                : 0;

              return (
                <div key={ph.department}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color }}>
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                      {ph.department}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ph.status === "completed" && (
                        <span className="text-[9px] font-bold text-[#3B82F6] uppercase bg-[rgba(59,130,246,0.15)] px-1.5 py-0.5 rounded">Done</span>
                      )}
                      {isPhaseOverdue && (
                        <span className="text-[9px] font-bold text-[#EF4444] uppercase bg-[rgba(239,68,68,0.15)] px-1.5 py-0.5 rounded">Overdue</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#8B9BC0] font-mono mb-2">
                    {fmtDate(ph.start)} → {fmtDate(ph.end)}
                  </div>
                  <div className="h-1.5 rounded-full bg-ground-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(ph.status === "completed" ? 1 : progress) * 100}%`,
                        background: ph.status === "completed" ? color + "66" : color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-[var(--border)]">
        {project.permalink ? (
          <a
            href={project.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[var(--border-2)] text-[13px] font-semibold text-[#4B9EFF] hover:bg-ground-3 hover:border-[#4B9EFF66] transition-all"
          >
            Open in Wrike
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ) : (
          <div className="text-[12px] text-[#5A6A94] text-center">No Wrike link available</div>
        )}
      </div>
    </div>
  );
}

// ─── Gantt range + ticks ──────────────────────────────────────────────────────────
function ganttRange(zoom: GanttZoom, projects: ScheduleProject[], phaseMap: Record<string, DepartmentPhase[]>): [string, string] {
  const t = todayStr();
  if (zoom === "12months") return [addMonths(t, -2), addMonths(t, 10)];
  const all = [
    ...projects.flatMap(p => [p.startDate, p.endDate]),
    ...projects.flatMap(p => (phaseMap[p.id] ?? []).flatMap(ph => [ph.start, ph.end])),
  ].filter(Boolean);
  if (!all.length) return [addMonths(t, -1), addMonths(t, 6)];
  const min = all.reduce((a, b) => (a < b ? a : b));
  const max = all.reduce((a, b) => (a > b ? a : b));
  const pad = zoom === "week" ? 28 : zoom === "year" ? 90 : 30;
  return [addDays(min, -pad), addDays(max, pad)];
}

function monthTicks(start: string, end: string, ppd: number) {
  const ticks: Array<{ label: string; offset: number; isYear: boolean }> = [];
  let cur = start.slice(0, 7) + "-01";
  while (cur <= end) {
    const d = parseDate(cur);
    ticks.push({
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      offset: Math.max(0, daysBetween(start, cur)) * ppd,
      isYear: d.getMonth() === 0,
    });
    d.setMonth(d.getMonth() + 1); d.setDate(1);
    cur = d.toISOString().slice(0, 10);
  }
  return ticks;
}

// ─── Leadership Gantt ─────────────────────────────────────────────────────────────
function LeadershipGantt({
  projects, phaseMap, zoom, onSelect, selectedId,
}: {
  projects: ScheduleProject[];
  phaseMap: Record<string, DepartmentPhase[]>;
  zoom: GanttZoom;
  onSelect: (p: ScheduleProject) => void;
  selectedId: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = todayStr();

  const [rs, re] = ganttRange(zoom, projects, phaseMap);
  const ppd       = PX_PER_DAY[zoom];
  const totalDays = Math.max(30, daysBetween(rs, re));
  const tlW       = totalDays * ppd;
  const todayOff  = Math.max(0, daysBetween(rs, today)) * ppd;
  const ticks     = monthTicks(rs, re, ppd);

  function scrollToToday() {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayOff - 320);
  }

  // Auto-scroll to today on mount
  useEffect(() => { setTimeout(scrollToToday, 80); }, []); // eslint-disable-line

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Legend + today button */}
      <div className="flex-shrink-0 flex items-center gap-4 px-4 py-1.5 bg-ground-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          {DEPTS.map(d => (
            <span key={d} className="flex items-center gap-1.5 text-[10px] text-[#8B9BC0]">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: DEPT_COLORS[d] }} />
              {d === "Design & Engineering" ? "D&E" : d}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-[#5A6A94] ml-2">
          <span className="inline-block w-4 h-1 rounded" style={{ background: "rgba(245,158,11,0.6)" }} />
          Today
        </span>
        <button
          onClick={scrollToToday}
          className="ml-auto px-3 py-1 rounded-lg border border-[var(--border)] text-[11px] text-[#8B9BC0] hover:text-[#EEF0FF] hover:border-[var(--border-2)] transition-all"
        >
          Jump to Today
        </button>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div style={{ minWidth: LEFT_W + tlW }}>

          {/* Sticky header */}
          <div
            className="sticky top-0 z-20 flex bg-ground-3 border-b border-[var(--border)]"
            style={{ height: HEADER_H }}
          >
            <div
              className="sticky left-0 z-30 flex-shrink-0 bg-ground-3 border-r border-[var(--border)] flex items-end pb-2 px-4"
              style={{ width: LEFT_W }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6A94]">Project</span>
            </div>
            <div className="relative flex-shrink-0" style={{ width: tlW }}>
              {ticks.map((tk, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute", left: tk.offset, top: 0, height: HEADER_H,
                    borderLeft: `1px solid ${tk.isYear ? "rgba(255,255,255,0.12)" : "var(--border)"}`,
                    paddingLeft: 7, paddingTop: 10,
                  }}
                >
                  <span
                    className="whitespace-nowrap"
                    style={{ fontSize: 10, fontWeight: tk.isYear ? 800 : 600, color: tk.isYear ? "#8B9BC0" : "#5A6A94" }}
                  >
                    {tk.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {projects.map(project => {
            const phases     = phaseMap[project.id] ?? [];
            const statusColor = STATUS_COLORS[project.status] ?? "#6B7280";
            const isSelected  = selectedId === project.id;
            const totalH      = phases.length * BAR_H + Math.max(0, phases.length - 1) * BAR_GAP;
            const groupTop    = Math.max(8, (ROW_H - totalH) / 2);

            return (
              <div
                key={project.id}
                className="flex border-b border-[var(--border)] cursor-pointer"
                style={{
                  height: ROW_H,
                  background: isSelected ? "rgba(75,158,255,0.07)" : undefined,
                }}
                onClick={() => onSelect(project)}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.018)"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = ""; }}
              >
                {/* Left label */}
                <div
                  className="sticky left-0 z-10 flex-shrink-0 flex flex-col justify-center px-3 gap-0.5 border-r border-[var(--border)]"
                  style={{
                    width: LEFT_W, height: ROW_H,
                    background: isSelected ? "#0F1A2B" : "var(--ground-2)",
                    borderLeft: `3px solid ${statusColor}`,
                  }}
                >
                  <span className="text-[13px] font-bold leading-none font-mono" style={{ color: "#4B9EFF" }}>
                    {project.number || "—"}
                  </span>
                  <span className="text-[10px] text-[#8B9BC0] truncate leading-snug mt-0.5">
                    {project.name || project.title}
                  </span>
                  {project.endDate && (
                    <span className="text-[9px] text-[#5A6A94] mt-0.5 font-mono">
                      {fmtYM(project.startDate)} → {fmtYM(project.endDate)}
                    </span>
                  )}
                </div>

                {/* Timeline */}
                <div className="relative flex-shrink-0" style={{ width: tlW, height: ROW_H }}>
                  {/* Grid lines */}
                  {ticks.map((tk, i) => (
                    <div key={i} style={{
                      position: "absolute", left: tk.offset, top: 0, bottom: 0,
                      width: 1, background: tk.isYear ? "rgba(255,255,255,0.06)" : "var(--border)",
                      pointerEvents: "none",
                    }} />
                  ))}
                  {/* Today line */}
                  <div style={{
                    position: "absolute", left: todayOff, top: 0, bottom: 0,
                    width: 1, background: "rgba(245,158,11,0.4)", zIndex: 1, pointerEvents: "none",
                  }} />

                  {/* Phase bars */}
                  {phases.map((ph, idx) => {
                    const color  = DEPT_COLORS[ph.department];
                    const left   = Math.max(0, daysBetween(rs, ph.start)) * ppd;
                    const width  = Math.max(12, daysBetween(ph.start, ph.end)) * ppd;
                    const top    = groupTop + idx * (BAR_H + BAR_GAP);
                    const done   = ph.status === "completed";
                    const overdue = ph.end < today && !done;
                    return (
                      <div
                        key={ph.department}
                        title={`${ph.department}: ${ph.start} → ${ph.end}`}
                        style={{
                          position: "absolute", left, top, width, height: BAR_H,
                          background: color + (done ? "44" : "CC"),
                          border: overdue ? "1px solid #EF444488" : `1px solid ${color}66`,
                          borderRadius: 3, zIndex: 2,
                          display: "flex", alignItems: "center",
                          paddingLeft: 5, overflow: "hidden",
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ph.department === "Design & Engineering" ? "D&E" : ph.department}
                        </span>
                      </div>
                    );
                  })}

                  {/* Fallback bar */}
                  {phases.length === 0 && project.startDate && project.endDate && (
                    <div style={{
                      position: "absolute",
                      left:   Math.max(0, daysBetween(rs, project.startDate)) * ppd,
                      top:    ROW_H / 2 - 2,
                      width:  Math.max(4, daysBetween(project.startDate, project.endDate)) * ppd,
                      height: 4,
                      background: statusColor + "33", borderRadius: 2,
                    }} />
                  )}
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="flex items-center justify-center py-16 text-[#5A6A94] text-[13px]">
              No projects match the current filters.
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-ground-3 flex items-center px-4 py-2 gap-5 flex-wrap">
        {[
          { label: "On Track",  count: projects.filter(p => p.status === "Green").length,   color: "#238636" },
          { label: "At Risk",   count: projects.filter(p => p.status === "Yellow").length,  color: "#D97706" },
          { label: "Off Track", count: projects.filter(p => p.status === "Red").length,     color: "#EF4444" },
          { label: "Completed", count: projects.filter(p => p.status === "Completed").length, color: "#3B82F6" },
        ].map(s => (
          <span key={s.label} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span style={{ color: s.color }} className="font-bold">{s.count}</span>
            <span className="text-[#5A6A94]">{s.label}</span>
          </span>
        ))}
        <span className="ml-auto text-[10px] text-[#5A6A94]">Click any row to drill in</span>
      </div>
    </div>
  );
}

// ─── Portfolio card ───────────────────────────────────────────────────────────────
function ProjectCard({
  project, phases, onClick, isSelected,
}: {
  project: ScheduleProject;
  phases: DepartmentPhase[];
  onClick: () => void;
  isSelected: boolean;
}) {
  const statusColor = STATUS_COLORS[project.status] ?? "#6B7280";
  const today = todayStr();
  const daysLeft = project.endDate ? daysBetween(today, project.endDate) : null;

  return (
    <div
      onClick={onClick}
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{
        background: isSelected ? "rgba(75,158,255,0.07)" : "var(--ground-2)",
        border: isSelected ? "1px solid rgba(75,158,255,0.4)" : "1px solid var(--border)",
        borderLeft: `3px solid ${statusColor}`,
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(75,158,255,0.25)"; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[15px] font-black font-mono text-[#4B9EFF] leading-none flex-shrink-0">
            {project.number || "—"}
          </span>
          <StatusBadge status={project.status} />
        </div>

        {/* Name */}
        <div className="text-[12px] text-[#C8D0E8] leading-snug mb-3 min-h-[32px]"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {project.name || project.title}
        </div>

        {/* Department phase dots */}
        <div className="flex items-center gap-2 mb-3">
          {phases.length === 0 ? (
            <span className="text-[10px] text-[#5A6A94]">No phases</span>
          ) : (
            phases.map(ph => (
              <span
                key={ph.department}
                title={`${ph.department}: ${ph.start} → ${ph.end}`}
                className="flex items-center gap-1 text-[9px] font-bold"
                style={{ color: DEPT_COLORS[ph.department] }}
              >
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: DEPT_COLORS[ph.department] }} />
                {ph.department === "Design & Engineering" ? "D&E" : ph.department}
              </span>
            ))
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <span className="text-[10px] text-[#5A6A94] font-mono">
            {fmtYM(project.startDate)} → {fmtYM(project.endDate)}
          </span>
          {daysLeft !== null && project.status !== "Completed" && project.status !== "Cancelled" && (
            <span
              className="text-[10px] font-bold"
              style={{ color: daysLeft < 0 ? "#EF4444" : daysLeft < 30 ? "#D97706" : "#5A6A94" }}
            >
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Portfolio grid ───────────────────────────────────────────────────────────────
function PortfolioGrid({
  projects, phaseMap, onSelect, selectedId,
}: {
  projects: ScheduleProject[];
  phaseMap: Record<string, DepartmentPhase[]>;
  onSelect: (p: ScheduleProject) => void;
  selectedId: string | null;
}) {
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#5A6A94] text-[13px]">
        No projects match the current filters.
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(256px, 1fr))", gap: 10 }}>
        {projects.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            phases={phaseMap[p.id] ?? []}
            onClick={() => onSelect(p)}
            isSelected={selectedId === p.id}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────────
export default function ConsolidatedDashboard() {
  const [view, setView]                   = useState<"gantt" | "portfolio">("gantt");
  const [zoom, setZoom]                   = useState<GanttZoom>("year");
  const [filters, setFilters]             = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected]           = useState<ScheduleProject | null>(null);

  const { data, isLoading, isError, error } = useGanttData();
  const projects  = data?.projects ?? [];
  const phaseMap  = data?.phaseMap ?? {};

  // Sort: critical first
  const sorted = useMemo(
    () => [...projects].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)),
    [projects]
  );

  // Apply all filters
  const filtered = useMemo(() => {
    return sorted.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !(p.number ?? "").toLowerCase().includes(q) &&
          !(p.name ?? "").toLowerCase().includes(q)
        ) return false;
      }
      if (filters.pastDueOnly && !p.isOverdue) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
      if (filters.departments.length > 0) {
        const ph = phaseMap[p.id] ?? [];
        if (!filters.departments.some(d => ph.some(x => x.department === d))) return false;
      }
      return true;
    });
  }, [sorted, filters, phaseMap]);

  // Escape key closes drill-down
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setSelected(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSelect(p: ScheduleProject) {
    setSelected(prev => prev?.id === p.id ? null : p);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Topbar title="Consolidated Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#238636] border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-[#8B9BC0]">Loading portfolio from Wrike…</p>
            <p className="text-[11px] text-[#5A6A94] mt-1">01.0 Current Active Projects</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Topbar title="Consolidated Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[13px] text-[#EF4444] font-semibold">Failed to load portfolio</p>
            <p className="text-[11px] text-[#5A6A94] mt-1 max-w-xs">
              {error instanceof Error ? error.message : "Check your Wrike connection and refresh."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ marginRight: selected ? 360 : 0, transition: "margin-right 0.2s ease" }}
    >
      <Topbar title="Consolidated Dashboard" syncedAt={data?.syncedAt} />

      <KPIStrip projects={sorted} />

      <FilterToolbar
        filters={filters} onFilters={setFilters}
        view={view} onView={setView}
        zoom={zoom} onZoom={setZoom}
        total={sorted.length} visible={filtered.length}
      />

      <div className="flex-1 overflow-hidden">
        {view === "gantt" && (
          <LeadershipGantt
            projects={filtered}
            phaseMap={phaseMap}
            zoom={zoom}
            onSelect={handleSelect}
            selectedId={selected?.id ?? null}
          />
        )}
        {view === "portfolio" && (
          <PortfolioGrid
            projects={filtered}
            phaseMap={phaseMap}
            onSelect={handleSelect}
            selectedId={selected?.id ?? null}
          />
        )}
      </div>

      {selected && (
        <DrillDownPanel
          project={selected}
          phases={phaseMap[selected.id] ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
