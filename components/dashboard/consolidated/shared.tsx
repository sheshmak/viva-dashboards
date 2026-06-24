"use client";

import type { ScheduleProject, GanttZoom } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase } from "@/lib/wrike";
import { STATUS_COLORS, STATUS_LABELS } from "@/app/dashboard/schedule/types";

export type View = "gantt" | "portfolio" | "overview" | "tasks";

export const PX_PER_DAY: Record<GanttZoom, number> = {
  week: 40, month: 10, quarter: 3.5, year: 1.8, "12months": 2.8,
};
export const ZOOM_LABELS: Record<GanttZoom, string> = {
  week: "Week", month: "Month", quarter: "Quarter", year: "Year", "12months": "12 Mo",
};
export const DENSITY_ROW_H: Record<Density, number> = { comfortable: 72, compact: 44 };
export type GroupBy = "none" | "status" | "risk" | "client";
export type Density = "comfortable" | "compact";

// Critical → stable → done
export const STATUS_ORDER: Record<string, number> = {
  Red: 0, Yellow: 1, Green: 2, OnHold: 3, Cancelled: 4, Completed: 5,
};

export const STATUSES = ["Green", "Yellow", "Red", "Completed", "OnHold", "Cancelled"] as const;
export const DEPTS = ["Design & Engineering", "Fabrication", "Install"] as const;

// Risk levels come from the Wrike "Risk" custom field, e.g. "1. On Track".
export const RISKS = [
  { key: "1", label: "On Track",       color: "#238636" },
  { key: "2", label: "Potential Risk", color: "#D97706" },
  { key: "3", label: "At Risk",        color: "#EF4444" },
  { key: "4", label: "ELT Risk",       color: "#B91C1C" },
] as const;

export type SortKey = "priority" | "number" | "name" | "endSoon" | "startSoon" | "progress";
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "priority",  label: "Priority (critical first)" },
  { key: "endSoon",   label: "End date (soonest)" },
  { key: "startSoon", label: "Start date (soonest)" },
  { key: "progress",  label: "Progress (least first)" },
  { key: "number",    label: "Project number" },
  { key: "name",      label: "Name (A–Z)" },
];

export const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "none",   label: "None" },
  { key: "status", label: "Status" },
  { key: "risk",   label: "Risk" },
  { key: "client", label: "Client" },
];

export interface Filters {
  search:      string;
  statuses:    string[];
  departments: string[];
  risks:       string[];
  pastDueOnly: boolean;
  sort:        SortKey;
  group:       GroupBy;
}
export const EMPTY_FILTERS: Filters = {
  search: "", statuses: [], departments: [], risks: [], pastDueOnly: false, sort: "priority", group: "none",
};
export const LS_KEY = "viva.consolidated.v2";

export type PresetKey = "all" | "active" | "overdue" | "atrisk" | "completed";
export const PRESETS: { key: PresetKey; label: string; statuses: string[]; pastDueOnly: boolean }[] = [
  { key: "all",       label: "All",       statuses: [],                                   pastDueOnly: false },
  { key: "active",    label: "Active",    statuses: ["Green", "Yellow", "Red", "OnHold"], pastDueOnly: false },
  { key: "overdue",   label: "Overdue",   statuses: [],                                   pastDueOnly: true  },
  { key: "atrisk",    label: "At Risk",   statuses: ["Red", "Yellow"],                    pastDueOnly: false },
  { key: "completed", label: "Completed", statuses: ["Completed"],                        pastDueOnly: false },
];
export function presetMatches(f: Filters, p: (typeof PRESETS)[number]): boolean {
  const sameStatuses =
    f.statuses.length === p.statuses.length &&
    p.statuses.every((s) => f.statuses.includes(s));
  return sameStatuses && f.pastDueOnly === p.pastDueOnly;
}

/**
 * Schedule progress for a project (0..1):
 *  - explicit backend `progress` if present
 *  - 1 when Completed
 *  - else time-elapsed between start and end (where today sits on the bar)
 *  - else fraction of completed department phases
 * (Wrike's bulk feed can't give reliable per-task completion; the drill-down
 *  panel shows true task completion for the selected project.)
 */
export function projectProgress(p: ScheduleProject, phases: DepartmentPhase[]): number {
  const pAny = p as ScheduleProject & { progress?: number };
  if (typeof pAny.progress === "number") return Math.max(0, Math.min(1, pAny.progress));
  if (p.status === "Completed") return 1;
  if (p.startDate && p.endDate) {
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    const now = Date.now();
    if (end > start) return Math.max(0, Math.min(1, (now - start) / (end - start)));
  }
  if (!phases.length) return 0;
  return phases.filter((ph) => ph.status === "completed").length / phases.length;
}

export function riskMeta(risk?: string) {
  const r = (risk ?? "").trim();
  return RISKS.find((x) => r.startsWith(x.key));
}

/** The group bucket for a project, given a GroupBy mode. */
export function groupOf(p: ScheduleProject, group: GroupBy): { key: string; label: string } {
  switch (group) {
    case "status":
      return { key: p.status, label: STATUS_LABELS[p.status] ?? p.status };
    case "risk": {
      const r = riskMeta(p.risk);
      return r ? { key: r.key, label: r.label } : { key: "z", label: "No risk set" };
    }
    case "client": {
      // Client/job code = the project-number prefix (e.g. "24" of "24-011"); fall back to first word.
      const m = p.number?.match(/^(\d{2})/);
      const key = m ? `20${m[1]}` : (p.name || p.title).split(" ")[0] || "—";
      return { key, label: m ? `FY ${m[1]}` : key };
    }
    case "none":
    default:
      return { key: "all", label: "All projects" };
  }
}

// ─── Atoms ──────────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
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

export function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ground-3)" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}
