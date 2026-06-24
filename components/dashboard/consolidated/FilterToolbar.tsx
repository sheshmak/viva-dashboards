"use client";

import { STATUS_COLORS, STATUS_LABELS, DEPT_COLORS } from "@/app/dashboard/schedule/types";
import type { GanttZoom } from "@/app/dashboard/schedule/types";
import {
  Filters, View, Density, SortKey, GroupBy,
  STATUSES, DEPTS, RISKS, SORT_OPTIONS, GROUP_OPTIONS, PRESETS, EMPTY_FILTERS,
  ZOOM_LABELS, presetMatches,
} from "./shared";

const VIEW_TABS: { key: View; label: string }[] = [
  { key: "gantt",     label: "Gantt" },
  { key: "portfolio", label: "Portfolio" },
  { key: "overview",  label: "Overview" },
  { key: "tasks",     label: "Tasks" },
];

export function FilterToolbar({
  filters, onFilters,
  view, onView,
  zoom, onZoom,
  density, onDensity,
  showDeps, onShowDeps,
  onExportCsv, onPrint,
  total, visible,
}: {
  filters: Filters; onFilters: (f: Filters) => void;
  view: View; onView: (v: View) => void;
  zoom: GanttZoom; onZoom: (z: GanttZoom) => void;
  density: Density; onDensity: (d: Density) => void;
  showDeps: boolean; onShowDeps: (b: boolean) => void;
  onExportCsv: () => void; onPrint: () => void;
  total: number; visible: number;
}) {
  const hasActive =
    filters.statuses.length > 0 || filters.departments.length > 0 ||
    filters.risks.length > 0 || !!filters.search || filters.pastDueOnly;
  const ganttish = view === "gantt";

  return (
    <div className="flex flex-col border-b border-[var(--border)] bg-ground-2 flex-shrink-0">
      {/* Row 0: view tabs + presets + sort */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] flex-wrap">
        <div className="flex bg-ground-3 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
          {VIEW_TABS.map(t => (
            <button key={t.key} onClick={() => onView(t.key)}
              className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
              style={{ background: view === t.key ? "var(--primary)" : "transparent", color: view === t.key ? "#fff" : "var(--text-2)" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="w-px h-5 mx-1" style={{ background: "var(--border-2)" }} />
        <span className="text-[10px] text-[color:var(--text-3)] uppercase tracking-wider font-semibold mr-1">Quick</span>
        {PRESETS.map(p => {
          const active = presetMatches(filters, p);
          return (
            <button key={p.key}
              onClick={() => onFilters({ ...filters, statuses: [...p.statuses], pastDueOnly: p.pastDueOnly })}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={{
                background: active ? "var(--primary)" : "transparent",
                borderColor: active ? "var(--primary)" : "var(--border)",
                color: active ? "#fff" : "var(--text-2)",
              }}
            >
              {p.label}
            </button>
          );
        })}

        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <button onClick={onExportCsv} title="Export filtered projects to CSV"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] text-[11px] font-semibold text-[color:var(--text-2)] hover:border-[var(--border-2)] transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            CSV
          </button>
          <button onClick={onPrint} title="Print / save as PDF"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] text-[11px] font-semibold text-[color:var(--text-2)] hover:border-[var(--border-2)] transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            Print
          </button>
          <span className="w-px h-5 mx-0.5" style={{ background: "var(--border-2)" }} />
          <span className="text-[10px] text-[color:var(--text-3)] uppercase tracking-wider font-semibold">Sort</span>
          <select
            value={filters.sort}
            onChange={e => onFilters({ ...filters, sort: e.target.value as SortKey })}
            className="bg-ground-3 border border-[var(--border)] rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[color:var(--text)] focus:outline-none focus:border-[color:var(--link)] cursor-pointer"
          >
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Row 1: controls (hidden for overview/tasks where Gantt controls don't apply) */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-[300px]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--text-3)] pointer-events-none"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" placeholder="Search by project # or name…"
            value={filters.search}
            onChange={e => onFilters({ ...filters, search: e.target.value })}
            className="w-full bg-ground-3 border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[color:var(--text)] placeholder:text-[color:var(--text-3)] focus:outline-none focus:border-[color:var(--link)]"
          />
        </div>

        {/* Overdue toggle */}
        <button
          onClick={() => onFilters({ ...filters, pastDueOnly: !filters.pastDueOnly })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all flex-shrink-0"
          style={{
            background: filters.pastDueOnly ? "rgba(239,68,68,0.12)" : "transparent",
            borderColor: filters.pastDueOnly ? "#EF4444" : "var(--border)",
            color: filters.pastDueOnly ? "#EF4444" : "var(--text-3)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Overdue
        </button>

        {/* Group by */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-[color:var(--text-3)] uppercase tracking-wider font-semibold">Group</span>
          <select
            value={filters.group}
            onChange={e => onFilters({ ...filters, group: e.target.value as GroupBy })}
            className="bg-ground-3 border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] font-semibold text-[color:var(--text)] focus:outline-none focus:border-[color:var(--link)] cursor-pointer"
          >
            {GROUP_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        {/* Gantt-only controls */}
        {ganttish && (
          <>
            <div className="flex bg-ground-3 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
              {(Object.keys(ZOOM_LABELS) as GanttZoom[]).map(z => (
                <button key={z} onClick={() => onZoom(z)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all"
                  style={{ background: zoom === z ? "rgba(127,127,127,0.18)" : "transparent", color: zoom === z ? "var(--text)" : "var(--text-3)" }}
                >
                  {ZOOM_LABELS[z]}
                </button>
              ))}
            </div>

            <div className="flex bg-ground-3 rounded-lg p-0.5 gap-0.5 flex-shrink-0" title="Row density">
              {(["comfortable", "compact"] as Density[]).map(d => (
                <button key={d} onClick={() => onDensity(d)}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold transition-all"
                  style={{ background: density === d ? "rgba(127,127,127,0.18)" : "transparent", color: density === d ? "var(--text)" : "var(--text-3)" }}
                >
                  {d === "comfortable" ? "Roomy" : "Dense"}
                </button>
              ))}
            </div>

            <button
              onClick={() => onShowDeps(!showDeps)}
              title="Show dependency arrows"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all flex-shrink-0"
              style={{
                background: showDeps ? "rgba(79,107,237,0.14)" : "transparent",
                borderColor: showDeps ? "var(--primary)" : "var(--border)",
                color: showDeps ? "var(--link)" : "var(--text-3)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h8a4 4 0 0 1 4 4v8" /><polyline points="13 15 16 18 19 15" />
              </svg>
              Links
            </button>
          </>
        )}

        {/* Count */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <span className="text-[13px] font-bold text-[color:var(--text)]">{visible}</span>
          <span className="text-[11px] text-[color:var(--text-3)]">of {total} projects</span>
        </div>
      </div>

      {/* Row 2: status + dept + risk pills */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <span className="text-[10px] text-[color:var(--text-3)] uppercase tracking-wider font-semibold mr-1">Status</span>
        {STATUSES.map(s => {
          const active = filters.statuses.includes(s);
          const color = STATUS_COLORS[s] ?? "#6B7280";
          return (
            <button key={s}
              onClick={() => onFilters({ ...filters, statuses: active ? filters.statuses.filter(x => x !== s) : [...filters.statuses, s] })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
              style={{ background: active ? color + "22" : "transparent", borderColor: active ? color + "80" : "var(--border)", color: active ? color : "var(--text-2)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? color : "var(--text-3)" }} />
              {STATUS_LABELS[s] ?? s}
            </button>
          );
        })}

        <span className="text-[color:var(--border-2)] mx-1 select-none">|</span>
        <span className="text-[10px] text-[color:var(--text-3)] uppercase tracking-wider font-semibold mr-1">Dept</span>
        {DEPTS.map(d => {
          const active = filters.departments.includes(d);
          const color = DEPT_COLORS[d];
          return (
            <button key={d}
              onClick={() => onFilters({ ...filters, departments: active ? filters.departments.filter(x => x !== d) : [...filters.departments, d] })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
              style={{ background: active ? color + "22" : "transparent", borderColor: active ? color + "80" : "var(--border)", color: active ? color : "var(--text-2)" }}
            >
              <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: active ? color : "var(--text-3)" }} />
              {d === "Design & Engineering" ? "D&E" : d}
            </button>
          );
        })}

        <span className="text-[color:var(--border-2)] mx-1 select-none">|</span>
        <span className="text-[10px] text-[color:var(--text-3)] uppercase tracking-wider font-semibold mr-1">Risk</span>
        {RISKS.map(r => {
          const active = filters.risks.includes(r.key);
          return (
            <button key={r.key}
              onClick={() => onFilters({ ...filters, risks: active ? filters.risks.filter(x => x !== r.key) : [...filters.risks, r.key] })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
              style={{ background: active ? r.color + "22" : "transparent", borderColor: active ? r.color + "80" : "var(--border)", color: active ? r.color : "var(--text-2)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? r.color : "var(--text-3)" }} />
              {r.label}
            </button>
          );
        })}

        {hasActive && (
          <button onClick={() => onFilters({ ...EMPTY_FILTERS, sort: filters.sort, group: filters.group })}
            className="ml-auto text-[10px] text-[color:var(--text-3)] hover:text-[#EF4444] transition-colors flex items-center gap-1"
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
