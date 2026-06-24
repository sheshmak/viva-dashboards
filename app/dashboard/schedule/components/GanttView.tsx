"use client";

import { useRef, useState } from "react";
import {
  GanttZoom, DEPT_COLORS, Department,
  FilterState, DEPARTMENTS, STATUS_COLORS, STATUS_LABELS,
} from "../types";
import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase } from "@/lib/wrike";

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}
function addDays(s: string, n: number): string {
  const d = parseDate(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
}
function addMonths(s: string, n: number): string {
  const d = parseDate(s); d.setMonth(d.getMonth() + n); d.setDate(1); return d.toISOString().slice(0, 10);
}
function today(): string { return new Date().toISOString().slice(0, 10); }
function fmtDate(s: string): string {
  if (!s) return "—";
  return parseDate(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROW_H    = 108;
const BAR_H    = 22;
const BAR_GAP  = 6;
const LEFT_W   = 244;
const YEAR_H   = 20;
const MONTH_H  = 36;
const HEADER_H = YEAR_H + MONTH_H;

const PX_PER_DAY: Record<GanttZoom, number> = {
  week: 40, month: 10, quarter: 3.5, year: 1.8, "12months": 2.8,
};

const ZOOM_LABEL: Record<GanttZoom, string> = {
  week: "Week", month: "Month", quarter: "Quarter", year: "Year", "12months": "12 Month",
};

// ── Range + ticks ─────────────────────────────────────────────────────────────

function getRange(
  zoom: GanttZoom,
  projects: ScheduleProject[],
  phaseMap: Record<string, import("@/lib/wrike").DepartmentPhase[]>,
): [string, string] {
  const t = today();
  if (zoom === "12months") return [addMonths(t, -2), addMonths(t, 10)];
  const projectDates = projects.flatMap((p) => [p.startDate, p.endDate]);
  const phaseDates   = projects.flatMap((p) => (phaseMap[p.id] ?? []).flatMap((ph) => [ph.start, ph.end]));
  const allDates     = [...projectDates, ...phaseDates].filter(Boolean);
  const minDate  = allDates.length ? allDates.reduce((a, b) => (a < b ? a : b)) : t;
  const maxDate  = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : addMonths(t, 6);
  const pad = zoom === "week" ? 28 : zoom === "year" ? 60 : 30;
  return [addDays(minDate, -pad), addDays(maxDate, pad)];
}

interface Tick { label: string; offset: number; }

function buildTicks(zoom: GanttZoom, start: string, end: string, ppd: number): { upper: Tick[]; lower: Tick[] } {
  if (zoom === "week") {
    const lower: Tick[] = [];
    let cur = start;
    while (cur <= end) {
      lower.push({ label: parseDate(cur).toLocaleDateString("en-US", { month: "short", day: "numeric" }), offset: daysBetween(start, cur) * ppd });
      cur = addDays(cur, 7);
    }
    const upper: Tick[] = [];
    const d = parseDate(start); d.setDate(1);
    while (d.toISOString().slice(0, 10) <= end) {
      const s = d.toISOString().slice(0, 10);
      upper.push({ label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), offset: Math.max(0, daysBetween(start, s)) * ppd });
      d.setMonth(d.getMonth() + 1);
    }
    return { upper, lower };
  }

  if (zoom === "year") {
    const lower: Tick[] = [];
    const upper: Tick[] = [];
    const d = parseDate(start); d.setMonth(0); d.setDate(1);
    while (d.toISOString().slice(0, 10) <= end) {
      const s = d.toISOString().slice(0, 10);
      lower.push({ label: String(d.getFullYear()), offset: Math.max(0, daysBetween(start, s)) * ppd });
      d.setFullYear(d.getFullYear() + 1);
    }
    return { upper, lower };
  }

  // month / quarter / 12months → year row + month row
  const lower: Tick[] = [];
  const upper: Tick[] = [];
  const d = parseDate(start); d.setDate(1);
  let lastYear = -1;
  while (d.toISOString().slice(0, 10) <= end) {
    const s = d.toISOString().slice(0, 10);
    const off = Math.max(0, daysBetween(start, s)) * ppd;
    if (d.getFullYear() !== lastYear) {
      upper.push({ label: String(d.getFullYear()), offset: off });
      lastYear = d.getFullYear();
    }
    lower.push({ label: d.toLocaleDateString("en-US", { month: "short" }), offset: off });
    d.setMonth(d.getMonth() + 1);
  }
  return { upper, lower };
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState {
  project: ScheduleProject;
  phases:  DepartmentPhase[];
  x: number; y: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface GanttViewProps {
  projects:        ScheduleProject[];
  phaseMap:        Record<string, DepartmentPhase[]>;
  filters:         FilterState;
  zoom:            GanttZoom;
  onZoomChange:    (z: GanttZoom) => void;
  onFiltersChange: (f: FilterState) => void;
}

export function GanttView({ projects, phaseMap, filters, zoom, onZoomChange, onFiltersChange }: GanttViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  function openTooltip(project: ScheduleProject, phases: DepartmentPhase[], e: React.MouseEvent) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ project, phases, x: rect.right + 10, y: rect.top });
  }
  function startHideTooltip() { hideTimer.current = setTimeout(() => setTooltip(null), 120); }
  function cancelHideTooltip() { if (hideTimer.current) clearTimeout(hideTimer.current); }

  const allSelected = filters.departments.length === 0;
  const activeDepts: Department[] = allSelected ? [...DEPARTMENTS] : filters.departments;

  // Filter projects
  const filtered = projects.filter((p) => {
    if (filters.search && !p.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.pastDueOnly && !p.isOverdue) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
    if (filters.departments.length > 0) {
      const ph = phaseMap[p.id] ?? [];
      if (!filters.departments.some((d) => ph.some((x) => x.department === d))) return false;
    }
    return true;
  });

  // Layout
  const [rangeStart, rangeEnd] = getRange(zoom, filtered, phaseMap);
  const ppd       = PX_PER_DAY[zoom];
  const totalDays = Math.max(30, daysBetween(rangeStart, rangeEnd));
  const tlWidth   = totalDays * ppd;
  const todayOff  = Math.max(0, daysBetween(rangeStart, today())) * ppd;
  const innerWidth = LEFT_W + tlWidth;
  const { upper, lower } = buildTicks(zoom, rangeStart, rangeEnd, ppd);

  // Bottom dept counts
  const deptCounts = Object.fromEntries(
    activeDepts.map((dept) => [
      dept,
      filtered.filter((p) => (phaseMap[p.id] ?? []).some((ph) => ph.department === dept)).length,
    ])
  ) as Record<Department, number>;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-ground-2 flex-shrink-0 gap-3 flex-wrap">

        {/* Zoom */}
        <div className="flex items-center gap-0.5 bg-ground-3 rounded-lg p-0.5 flex-shrink-0">
          {(Object.keys(ZOOM_LABEL) as GanttZoom[]).map((z) => (
            <button
              key={z}
              onClick={() => onZoomChange(z)}
              className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
              style={{
                background: zoom === z ? "#238636" : "transparent",
                color:      zoom === z ? "#fff"     : "#5A6A94",
              }}
            >
              {ZOOM_LABEL[z]}
            </button>
          ))}
        </div>

        {/* Dept filter pills (All + each dept) */}
        <div className="flex items-center gap-1 flex-1 justify-center flex-wrap">
          <button
            onClick={() => onFiltersChange({ ...filters, departments: [] })}
            className="px-3 py-1 rounded-full text-[11px] font-semibold border transition-all"
            style={{
              background:  allSelected ? "#4B9EFF22" : "transparent",
              borderColor: allSelected ? "#4B9EFF"   : "var(--border)",
              color:       allSelected ? "#4B9EFF"   : "#5A6A94",
            }}
          >
            All
          </button>
          {DEPARTMENTS.map((d) => {
            const active = filters.departments.includes(d);
            return (
              <button
                key={d}
                onClick={() => {
                  const next = active
                    ? filters.departments.filter((x) => x !== d)
                    : [...filters.departments, d];
                  onFiltersChange({ ...filters, departments: next });
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all"
                style={{
                  background:  active ? DEPT_COLORS[d] + "22" : "transparent",
                  borderColor: active ? DEPT_COLORS[d] + "80" : "var(--border)",
                  color:       active ? DEPT_COLORS[d]        : "#8B9BC0",
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DEPT_COLORS[d] }} />
                {d}
              </button>
            );
          })}
        </div>

        {/* Legend + Today */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {DEPARTMENTS.map((d) => (
            <span key={d} className="flex items-center gap-1.5 text-[10px] text-[#8B9BC0]">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: DEPT_COLORS[d] }} />
              {d}
            </span>
          ))}
          <button
            onClick={() => { if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayOff - 300); }}
            className="ml-2 px-3 py-1 rounded-lg border border-[var(--border)] text-[11px] text-[#8B9BC0] hover:text-[#EEF0FF] transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Scrollable Gantt ────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div style={{ minWidth: innerWidth }}>

          {/* Two-row sticky header */}
          <div
            className="sticky top-0 z-20 bg-ground-3 border-b border-[var(--border)] flex"
            style={{ height: HEADER_H }}
          >
            {/* Corner */}
            <div
              className="sticky left-0 z-30 bg-ground-3 border-r border-[var(--border)] flex items-end pb-2 px-4 flex-shrink-0"
              style={{ width: LEFT_W }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6A94]">Project</span>
            </div>

            {/* Timeline header */}
            <div style={{ position: "relative", width: tlWidth, flexShrink: 0 }}>
              {/* Upper row (year or month-group) */}
              {upper.map((tick, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute", left: tick.offset, top: 0, height: YEAR_H,
                    borderLeft: "1px solid var(--border)", paddingLeft: 6, paddingTop: 3,
                  }}
                >
                  <span className="text-[11px] font-bold text-[#5A6A94] whitespace-nowrap">{tick.label}</span>
                </div>
              ))}
              {/* Lower row (month / week) */}
              {lower.map((tick, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute", left: tick.offset, top: YEAR_H, height: MONTH_H,
                    borderLeft: "1px solid var(--border)", paddingLeft: 6, paddingTop: 6,
                  }}
                >
                  <span className="text-[10px] font-mono text-[#8B9BC0] whitespace-nowrap">{tick.label}</span>
                </div>
              ))}
              {/* Today marker in header */}
              <div
                style={{
                  position: "absolute", left: todayOff, top: YEAR_H, height: MONTH_H,
                  width: 1, background: "#F59E0B", zIndex: 3,
                }}
              >
                <span style={{
                  position: "absolute", bottom: 4, left: -14,
                  background: "#F59E0B", color: "#000",
                  fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, whiteSpace: "nowrap",
                }}>
                  Today
                </span>
              </div>
            </div>
          </div>

          {/* Project rows */}
          {filtered.map((project) => {
            const phases    = (phaseMap[project.id] ?? []).filter((ph) => activeDepts.includes(ph.department));
            const allPhases = phaseMap[project.id] ?? [];
            const totalBarsH = phases.length * BAR_H + Math.max(0, phases.length - 1) * BAR_GAP;
            const groupTop   = Math.max(12, (ROW_H - totalBarsH) / 2);

            return (
              <div
                key={project.id}
                className="flex border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.015)] transition-colors"
                style={{ height: ROW_H }}
              >
                {/* Sticky left: project # link + name + date range */}
                <div
                  className="sticky left-0 z-10 bg-ground-2 border-r border-[var(--border)] flex flex-col justify-center px-4 gap-0.5 flex-shrink-0 group/row"
                  style={{ width: LEFT_W, height: ROW_H }}
                  onMouseEnter={(e) => openTooltip(project, allPhases, e)}
                  onMouseLeave={startHideTooltip}
                >
                  {/* Project number — always a Wrike link */}
                  <div className="flex items-center gap-1.5">
                    {project.permalink ? (
                      <a
                        href={project.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Wrike"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[15px] font-bold text-[#4B9EFF] hover:text-[#7BB8FF] hover:underline leading-none flex-shrink-0"
                      >
                        {project.number || "—"}
                      </a>
                    ) : (
                      <span className="text-[15px] font-bold text-[#4B9EFF] leading-none">
                        {project.number || "—"}
                      </span>
                    )}
                    {project.permalink && (
                      <a
                        href={project.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Wrike"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 text-[#4B9EFF66] hover:text-[#4B9EFF] transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                  {/* Project name — also a Wrike link */}
                  {project.permalink ? (
                    <a
                      href={project.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] text-[#C8D0E8] hover:text-[#EEF0FF] hover:underline truncate leading-snug mt-1 block"
                    >
                      {project.name || project.title}
                    </a>
                  ) : (
                    <span className="text-[11px] text-[#C8D0E8] truncate leading-snug mt-1">
                      {project.name || project.title}
                    </span>
                  )}
                  {(project.startDate || project.endDate) && (
                    <span className="text-[10px] text-[#5A6A94] mt-0.5 tabular-nums">
                      {fmtDate(project.startDate)} → {fmtDate(project.endDate)}
                    </span>
                  )}
                </div>

                {/* Timeline cell */}
                <div style={{ position: "relative", width: tlWidth, height: ROW_H, flexShrink: 0 }}>
                  {/* Grid lines */}
                  {lower.map((tick, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute", left: tick.offset, top: 0, bottom: 0,
                        width: 1, background: "var(--border)", pointerEvents: "none",
                      }}
                    />
                  ))}
                  {/* Today line */}
                  <div
                    style={{
                      position: "absolute", left: todayOff, top: 0, bottom: 0,
                      width: 1, background: "rgba(245,158,11,0.35)", zIndex: 1,
                    }}
                  />

                  {/* Labeled dept bars */}
                  {phases.map((phase, idx) => {
                    if (!phase.start || !phase.end) return null;
                    const color    = DEPT_COLORS[phase.department];
                    const barLeft  = Math.max(0, daysBetween(rangeStart, phase.start)) * ppd;
                    const barWidth = Math.max(24, daysBetween(phase.start, phase.end)) * ppd;
                    const barTop   = groupTop + idx * (BAR_H + BAR_GAP);
                    const done     = phase.status === "completed";
                    const overdue  = phase.end < today() && !done;

                    return (
                      <div
                        key={phase.department}
                        title={`${phase.department}: ${phase.start} → ${phase.end}`}
                        style={{
                          position: "absolute",
                          left:     barLeft,
                          top:      barTop,
                          width:    barWidth,
                          height:   BAR_H,
                          background: color + (done ? "55" : "CC"),
                          border:   overdue ? "1px solid #EF4444" : `1px solid ${color}99`,
                          borderRadius: 4,
                          zIndex: 2,
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: 7,
                          paddingRight: 4,
                          overflow: "hidden",
                        }}
                      >
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: "rgba(255,255,255,0.92)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          ● {phase.department}
                        </span>
                      </div>
                    );
                  })}

                  {/* Thin project-range bar when no dept phases found */}
                  {phases.length === 0 && project.startDate && project.endDate && (
                    <div
                      style={{
                        position: "absolute",
                        left:   Math.max(0, daysBetween(rangeStart, project.startDate)) * ppd,
                        top:    ROW_H / 2 - 2,
                        width:  Math.max(4, daysBetween(project.startDate, project.endDate)) * ppd,
                        height: 4,
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 2,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 text-[#5A6A94] text-[13px]">
              No projects match the current filters.
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom summary ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-ground-3 flex items-center px-4 py-2 gap-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6A94]">Showing</span>
          <span className="text-[15px] font-bold text-[#EEF0FF]">{filtered.length}</span>
          <span className="text-[11px] text-[#5A6A94]">of {projects.length} total</span>
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        {activeDepts.map((dept) => (
          <div key={dept} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: DEPT_COLORS[dept] }} />
            <span className="text-[11px] text-[#8B9BC0]">{dept}</span>
            <span className="text-[12px] font-semibold text-[#C8D0E8]">{deptCounts[dept] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* ── Hover tooltip ────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          onMouseEnter={cancelHideTooltip}
          onMouseLeave={startHideTooltip}
          style={{
            position: "fixed",
            left:     Math.min(tooltip.x, window.innerWidth - 330),
            top:      Math.max(8, Math.min(tooltip.y - 10, window.innerHeight - 340)),
            width: 310, zIndex: 9999, pointerEvents: "auto",
            background: "var(--ground-2)",
          }}
          className="rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono font-semibold text-[#5A6A94] bg-[var(--ground-3)] px-2 py-0.5 rounded">
                {tooltip.project.number || "—"}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{
                  background: (STATUS_COLORS[tooltip.project.status] ?? "#6B7280") + "22",
                  color:       STATUS_COLORS[tooltip.project.status]  ?? "#6B7280",
                }}
              >
                {STATUS_LABELS[tooltip.project.status] ?? tooltip.project.status}
              </span>
              {tooltip.project.risk && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#8B9BC0]">
                  {tooltip.project.risk.replace(/^\d+\.\s*/, "")}
                </span>
              )}
            </div>
            <p className="text-[12px] font-semibold text-[#EEF0FF] leading-snug line-clamp-2">
              {tooltip.project.name || tooltip.project.title}
            </p>
          </div>
          {/* Dates */}
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-3">
            <span className="text-[10px] text-[#5A6A94] uppercase tracking-wider w-10 flex-shrink-0">Start</span>
            <span className="text-[11px] text-[#C8D0E8]">{fmtDate(tooltip.project.startDate)}</span>
          </div>
          <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-3">
            <span className="text-[10px] text-[#5A6A94] uppercase tracking-wider w-10 flex-shrink-0">End</span>
            <span className={`text-[11px] ${tooltip.project.isOverdue ? "text-[#EF4444]" : "text-[#C8D0E8]"}`}>
              {fmtDate(tooltip.project.endDate)}
              {tooltip.project.isOverdue && <span className="ml-1 text-[10px]">· Overdue</span>}
            </span>
          </div>
          {/* Dept phases */}
          {tooltip.phases.length > 0 && (
            <div className="px-4 py-3 border-b border-[var(--border)] flex flex-col gap-2">
              {tooltip.phases.map((ph) => (
                <div key={ph.department} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: DEPT_COLORS[ph.department] }} />
                  <span className="text-[10px] text-[#8B9BC0] w-20 flex-shrink-0">{ph.department}</span>
                  <span className="text-[10px] text-[#5A6A94]">{fmtDate(ph.start)} → {fmtDate(ph.end)}</span>
                </div>
              ))}
            </div>
          )}
          {/* Wrike link */}
          {tooltip.project.permalink && (
            <div className="px-4 py-3">
              <a
                href={tooltip.project.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] font-semibold text-[#238636] hover:text-[#2EA043] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open in Wrike
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
