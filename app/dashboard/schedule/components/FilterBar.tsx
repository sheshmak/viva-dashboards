"use client";

import { DEPARTMENTS, DEPT_COLORS, FilterState, Department } from "../types";

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  projectCount: number;
  visibleCount: number;
}

const PRIORITIES = ["High", "Normal", "Low"];
const STATUSES = ["Green", "Yellow", "Red", "OnHold", "Completed", "Cancelled"];
const STATUS_LABELS: Record<string, string> = {
  Green: "On Track", Yellow: "At Risk", Red: "Off Track",
  OnHold: "On Hold", Completed: "Completed", Cancelled: "Cancelled",
};

export function FilterBar({ filters, onChange, projectCount, visibleCount }: FilterBarProps) {
  function toggleDept(d: Department) {
    const next = filters.departments.includes(d)
      ? filters.departments.filter((x) => x !== d)
      : [...filters.departments, d];
    onChange({ ...filters, departments: next });
  }

  function togglePriority(p: string) {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    onChange({ ...filters, priorities: next });
  }

  function toggleStatus(s: string) {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: next });
  }

  const hasFilters =
    filters.departments.length > 0 ||
    filters.priorities.length > 0 ||
    filters.statuses.length > 0 ||
    filters.pastDueOnly ||
    filters.search.length > 0;

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] bg-ground-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5A6A94]"
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search projects…"
          className="pl-7 pr-3 py-1.5 bg-ground-3 border border-[var(--border)] rounded-lg text-[12px] text-[#EEF0FF] placeholder:text-[#5A6A94] outline-none focus:border-[var(--border-2)] w-44"
        />
      </div>

      {/* Dept toggles */}
      <div className="flex items-center gap-1.5">
        {DEPARTMENTS.map((d) => {
          const active = filters.departments.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggleDept(d)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border"
              style={{
                background: active ? DEPT_COLORS[d] + "22" : "transparent",
                borderColor: active ? DEPT_COLORS[d] + "60" : "var(--border)",
                color: active ? DEPT_COLORS[d] : "#8B9BC0",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: DEPT_COLORS[d] }}
              />
              {d}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--border)]" />

      {/* Status toggles */}
      <div className="flex items-center gap-1">
        {STATUSES.map((s) => {
          const active = filters.statuses.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className="px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all border"
              style={{
                background: active ? "rgba(35,134,54,0.15)" : "transparent",
                borderColor: active ? "rgba(35,134,54,0.4)" : "var(--border)",
                color: active ? "#3DD68C" : "#5A6A94",
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--border)]" />

      {/* Past-due toggle */}
      <button
        onClick={() => onChange({ ...filters, pastDueOnly: !filters.pastDueOnly })}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border"
        style={{
          background: filters.pastDueOnly ? "rgba(239,68,68,0.15)" : "transparent",
          borderColor: filters.pastDueOnly ? "rgba(239,68,68,0.4)" : "var(--border)",
          color: filters.pastDueOnly ? "#EF4444" : "#5A6A94",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        Past Due
      </button>

      {/* Result count + clear */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[11px] text-[#5A6A94] font-mono">
          {visibleCount} / {projectCount} projects
        </span>
        {hasFilters && (
          <button
            onClick={() =>
              onChange({ departments: [], priorities: [], statuses: [], pastDueOnly: false, search: "" })
            }
            className="text-[11px] text-[#5A6A94] hover:text-[#EEF0FF] transition-colors underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
