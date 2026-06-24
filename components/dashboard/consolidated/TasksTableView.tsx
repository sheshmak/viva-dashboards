"use client";

import { useMemo, useState } from "react";
import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { WrikeTask } from "@/lib/wrike";
import { useScheduleTasks } from "@/hooks/useSchedule";
import { fmtDate, daysBetween, todayStr } from "@/lib/dateUtils";
import type { Filters } from "./shared";

type Col = "title" | "project" | "status" | "importance" | "start" | "due" | "duration";

const TASK_STATUS_COLOR: Record<string, string> = {
  Active: "#238636", Completed: "#3B82F6", Deferred: "#D97706", Cancelled: "#6B7280",
};

export function TasksTableView({ projects, filters }: { projects: ScheduleProject[]; filters: Filters }) {
  const { data, isLoading, isError, error } = useScheduleTasks();
  const today = todayStr();
  const [sortCol, setSortCol] = useState<Col>("due");
  const [asc, setAsc] = useState(true);

  // Map a task to its owning project (best-effort via parent/superParent IDs).
  const projById = useMemo(() => {
    const m = new Map<string, ScheduleProject>();
    projects.forEach(p => m.set(p.id, p));
    return m;
  }, [projects]);
  function projectFor(t: WrikeTask): ScheduleProject | undefined {
    for (const id of [...(t.parentIds ?? []), ...(t.superParentIds ?? [])]) {
      const p = projById.get(id);
      if (p) return p;
    }
    return undefined;
  }

  const rows = useMemo(() => {
    let tasks = data?.tasks ?? [];
    const q = filters.search.trim().toLowerCase();
    if (q) tasks = tasks.filter(t => t.title.toLowerCase().includes(q));
    if (filters.pastDueOnly) tasks = tasks.filter(t => t.dates?.due && t.dates.due < today && t.status !== "Completed" && t.status !== "Cancelled");

    const withProj = tasks.map(t => ({ t, p: projectFor(t) }));
    const dir = asc ? 1 : -1;
    withProj.sort((a, b) => {
      switch (sortCol) {
        case "title":      return dir * a.t.title.localeCompare(b.t.title);
        case "project":    return dir * (a.p?.number ?? "").localeCompare(b.p?.number ?? "");
        case "status":     return dir * a.t.status.localeCompare(b.t.status);
        case "importance": return dir * (a.t.importance ?? "").localeCompare(b.t.importance ?? "");
        case "start":      return dir * (a.t.dates?.start || "9999").localeCompare(b.t.dates?.start || "9999");
        case "duration":   return dir * ((a.t.dates?.duration ?? 0) - (b.t.dates?.duration ?? 0));
        case "due":
        default:           return dir * (a.t.dates?.due || "9999").localeCompare(b.t.dates?.due || "9999");
      }
    });
    return withProj;
  }, [data, filters.search, filters.pastDueOnly, sortCol, asc, today]); // eslint-disable-line

  function header(col: Col, label: string, extra = "") {
    const activeC = sortCol === col;
    return (
      <button onClick={() => { if (activeC) setAsc(a => !a); else { setSortCol(col); setAsc(true); } }}
        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${extra}`} style={{ color: activeC ? "var(--text)" : "var(--text-3)" }}>
        {label}
        {activeC && <span>{asc ? "↑" : "↓"}</span>}
      </button>
    );
  }

  if (isLoading) return <div className="p-6 text-[13px]" style={{ color: "var(--text-3)" }}>Loading tasks…</div>;
  if (isError) return <div className="p-6 text-[13px]" style={{ color: "#EF4444" }}>{error instanceof Error ? error.message : "Failed to load tasks"}</div>;

  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px]" style={{ color: "var(--text-2)" }}>{rows.length} tasks{data?.truncated ? " (truncated)" : ""}</span>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="grid items-center px-4 py-2.5 sticky top-0 z-10" style={{ gridTemplateColumns: "2fr 0.8fr 0.9fr 0.8fr 0.9fr 0.9fr 0.6fr", background: "var(--ground-3)", borderBottom: "1px solid var(--border)" }}>
          {header("title", "Task")}{header("project", "Project")}{header("status", "Status")}{header("importance", "Priority")}{header("start", "Start")}{header("due", "Due")}{header("duration", "Days")}
        </div>
        {rows.length === 0 ? (
          <div className="p-6 text-[13px]" style={{ color: "var(--text-3)" }}>No tasks match the current filters.</div>
        ) : rows.slice(0, 500).map(({ t, p }) => {
          const overdue = t.dates?.due && t.dates.due < today && t.status !== "Completed" && t.status !== "Cancelled";
          const sc = TASK_STATUS_COLOR[t.status] ?? "#6B7280";
          return (
            <div key={t.id} className="grid items-center px-4 py-2.5 text-[12px]" style={{ gridTemplateColumns: "2fr 0.8fr 0.9fr 0.8fr 0.9fr 0.9fr 0.6fr", borderBottom: "1px solid var(--border)", background: overdue ? "rgba(239,68,68,0.05)" : "transparent" }}>
              <span className="truncate pr-2" style={{ color: "var(--text-soft)" }}>{t.title}</span>
              <span className="font-mono text-[11px]" style={{ color: "var(--link)" }}>{p?.number ?? "—"}</span>
              <span><span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: sc + "22", color: sc }}>{t.status}</span></span>
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{t.importance ?? "—"}</span>
              <span className="font-mono text-[11px]" style={{ color: "var(--text-3)" }}>{t.dates?.start ? fmtDate(t.dates.start) : "—"}</span>
              <span className="font-mono text-[11px]" style={{ color: overdue ? "#EF4444" : "var(--text-3)" }}>{t.dates?.due ? fmtDate(t.dates.due) : "—"}</span>
              <span className="text-[11px] tabular-nums" style={{ color: "var(--text-3)" }}>{t.dates?.start && t.dates?.due ? Math.max(0, daysBetween(t.dates.start, t.dates.due)) : "—"}</span>
            </div>
          );
        })}
      </div>
      {rows.length > 500 && <div className="text-[10px] text-center pt-3" style={{ color: "var(--text-3)" }}>Showing first 500 of {rows.length}</div>}
    </div>
  );
}
