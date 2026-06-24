"use client";

import { useState, useMemo } from "react";
import { useScheduleTasks } from "@/hooks/useSchedule";
import { ScheduleProject, DEPT_COLORS, STATUS_COLORS, FilterState } from "../types";
import type { WrikeTask } from "@/lib/wrike";
import { cn } from "@/lib/utils";

type SortField = "title" | "status" | "importance" | "dueDate" | "startDate";
type SortDir = "asc" | "desc";

const IMPORTANCE_ORDER: Record<string, number> = { High: 0, Normal: 1, Low: 2 };
const today = new Date().toISOString().slice(0, 10);

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "Active" ? "chip-green" :
    status === "Completed" ? "chip-blue" :
    status === "Deferred" ? "chip-amber" :
    "chip-muted";
  return <span className={cls}>{status}</span>;
}

function ImportanceChip({ importance }: { importance: string }) {
  const color =
    importance === "High" ? "#EF4444" :
    importance === "Normal" ? "#D97706" :
    "#5A6A94";
  return (
    <span
      className="chip-base"
      style={{ background: color + "22", color }}
    >
      {importance}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#FFB020" : "#5A6A94"} strokeWidth="2.5" strokeLinecap="round"
    >
      {dir === "asc" || !active ? (
        <polyline points="18 15 12 9 6 15" />
      ) : (
        <polyline points="6 9 12 15 18 9" />
      )}
    </svg>
  );
}

interface TaskTableViewProps {
  projects: ScheduleProject[];
  filters: FilterState;
}

// Default dateRange: past 60 days → next 120 days (matches the API default)
function defaultWindow() {
  const now = new Date();
  const s = new Date(now); s.setDate(now.getDate() - 60);
  const e = new Date(now); e.setDate(now.getDate() + 120);
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
}

export function TaskTableView({ projects, filters }: TaskTableViewProps) {
  const [dateRange, setDateRange] = useState(defaultWindow);
  const { data, isLoading, isError, error } = useScheduleTasks({ start: dateRange.start, end: dateRange.end });
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: "dueDate", dir: "asc" });

  const projectMap = useMemo(() => {
    const m = new Map<string, ScheduleProject>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  // Build a field-name lookup from custom field definitions
  const fieldNameMap = useMemo(() => {
    const m = new Map<string, string>();
    data?.fields?.forEach((f) => m.set(f.id, f.title));
    return m;
  }, [data?.fields]);

  const tasks = useMemo<WrikeTask[]>(() => {
    if (!data?.tasks) return [];
    let list = data.tasks;

    // Filter by project search/status
    list = list.filter((t) => {
      const project = t.superParentIds?.find((id) => projectMap.has(id)) ? projectMap.get(t.superParentIds.find((id) => projectMap.has(id))!) : undefined;
      if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          (!project || !project.title.toLowerCase().includes(filters.search.toLowerCase()))) {
        return false;
      }
      if (filters.pastDueOnly) {
        const due = t.dates?.due;
        if (!due || due >= today || t.status === "Completed") return false;
      }
      if (filters.priorities.length > 0 && !filters.priorities.includes(t.importance)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false;
      return true;
    });

    // Sort
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sort.field === "title") cmp = a.title.localeCompare(b.title);
      else if (sort.field === "status") cmp = (a.status ?? "").localeCompare(b.status ?? "");
      else if (sort.field === "importance") cmp = (IMPORTANCE_ORDER[a.importance] ?? 9) - (IMPORTANCE_ORDER[b.importance] ?? 9);
      else if (sort.field === "dueDate") {
        const da = a.dates?.due ? new Date(a.dates.due).getTime() : Infinity;
        const db = b.dates?.due ? new Date(b.dates.due).getTime() : Infinity;
        cmp = da - db;
      } else if (sort.field === "startDate") {
        const da = a.dates?.start ? new Date(a.dates.start).getTime() : Infinity;
        const db = b.dates?.start ? new Date(b.dates.start).getTime() : Infinity;
        cmp = da - db;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [data, filters, sort, projectMap]);

  function handleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  }

  const COL = (label: string, field?: SortField) => (
    <th
      className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#5A6A94] border-b border-[var(--border-2)] whitespace-nowrap"
      style={{ cursor: field ? "pointer" : "default", userSelect: "none" }}
      onClick={() => field && handleSort(field)}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {field && <SortIcon active={sort.field === field} dir={sort.dir} />}
      </span>
    </th>
  );

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[#EF4444] text-[13px] font-semibold">Failed to load tasks</p>
          <p className="text-[#5A6A94] text-[12px] mt-1 max-w-sm">
            {error instanceof Error ? error.message : "Check your Wrike connection and refresh."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-1.5 rounded-lg bg-ground-3 border border-[var(--border)] text-[12px] text-[#8B9BC0] hover:text-[#EEF0FF] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Count bar */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-[var(--border)] bg-ground-2 flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#8B9BC0]">
            {isLoading ? "Loading tasks…" : `${tasks.length} tasks`}
          </span>
          {data?.truncated && (
            <span className="text-[10px] text-[#D97706] bg-[rgba(217,119,6,0.12)] px-2 py-0.5 rounded-full">
              Showing first 2 000 — narrow the date range to see more
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#5A6A94]">Scheduled</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((w) => ({ ...w, start: e.target.value }))}
            className="bg-ground-3 border border-[var(--border)] rounded px-2 py-0.5 text-[11px] text-[#8B9BC0] focus:outline-none focus:border-[#4B9EFF]"
          />
          <span className="text-[10px] text-[#5A6A94]">→</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((w) => ({ ...w, end: e.target.value }))}
            className="bg-ground-3 border border-[var(--border)] rounded px-2 py-0.5 text-[11px] text-[#8B9BC0] focus:outline-none focus:border-[#4B9EFF]"
          />
          <span className="text-[11px] text-[#5A6A94]">
            {tasks.filter((t) => t.dates?.due && t.dates.due < today && t.status !== "Completed").length} past due
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[12px]" style={{ minWidth: 1100 }}>
          <thead className="sticky top-0 z-10 bg-ground-3">
            <tr>
              {COL("Project")}
              {COL("Task", "title")}
              {COL("Status", "status")}
              {COL("Priority", "importance")}
              {COL("Start", "startDate")}
              {COL("Due", "dueDate")}
              {COL("Duration")}
              {COL("Custom Fields")}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-3 py-3 border-b border-[var(--border)]">
                      <div className="h-3 rounded bg-ground-3 animate-pulse" style={{ width: j === 1 ? "80%" : "60%" }} />
                    </td>
                  ))}
                </tr>
              ))}
            {!isLoading &&
              tasks.map((task) => {
                const projectId = task.superParentIds?.find((id) => projectMap.has(id));
                const project = projectId ? projectMap.get(projectId) : undefined;
                const isOverdue =
                  task.dates?.due &&
                  task.dates.due < today &&
                  task.status !== "Completed";
                const isDone = task.status === "Completed";
                const duration = task.dates?.start && task.dates?.due
                  ? Math.max(1, Math.round((new Date(task.dates.due).getTime() - new Date(task.dates.start).getTime()) / 86400000))
                  : null;

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "border-b border-[var(--border)] hover:bg-ground-3 transition-colors",
                      isOverdue && "bg-[rgba(239,68,68,0.04)]"
                    )}
                  >
                    {/* Project */}
                    <td className="px-3 py-3 max-w-[180px]">
                      {project ? (
                        <div>
                          {project.number && (
                            <span className="font-mono text-[10px] text-[#5A6A94]">{project.number} </span>
                          )}
                          <span className="text-[#8B9BC0] truncate">{project.name || project.title}</span>
                        </div>
                      ) : (
                        <span className="text-[#5A6A94]">—</span>
                      )}
                    </td>

                    {/* Task title */}
                    <td className="px-3 py-3 max-w-[240px]">
                      <div className="flex items-center gap-2">
                        {isOverdue && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="#EF4444">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                        )}
                        <span
                          className={cn(
                            "truncate",
                            isDone && "line-through text-[#5A6A94]"
                          )}
                          title={task.title}
                        >
                          {task.title}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusChip status={task.status} />
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <ImportanceChip importance={task.importance} />
                    </td>

                    {/* Start */}
                    <td className="px-3 py-3 font-mono text-[11px] text-[#8B9BC0] whitespace-nowrap">
                      {task.dates?.start ?? "—"}
                    </td>

                    {/* Due */}
                    <td
                      className={cn(
                        "px-3 py-3 font-mono text-[11px] whitespace-nowrap",
                        isOverdue ? "text-[#EF4444] font-semibold" : "text-[#8B9BC0]"
                      )}
                    >
                      {task.dates?.due ?? "—"}
                    </td>

                    {/* Duration */}
                    <td className="px-3 py-3 font-mono text-[11px] text-[#8B9BC0] whitespace-nowrap">
                      {duration !== null ? `${duration}d` : "—"}
                    </td>

                    {/* Custom fields (condensed) */}
                    <td className="px-3 py-3 max-w-[200px]">
                      {task.customFields && task.customFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.customFields.slice(0, 3).map((cf) => (
                            <span
                              key={cf.id}
                              className="chip-muted max-w-[80px] truncate"
                              title={`${fieldNameMap.get(cf.id) ?? cf.id}: ${cf.value}`}
                            >
                              {cf.value || "—"}
                            </span>
                          ))}
                          {task.customFields.length > 3 && (
                            <span className="text-[10px] text-[#5A6A94]">
                              +{task.customFields.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#5A6A94]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

            {!isLoading && tasks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-[#5A6A94] text-[13px]">
                  No tasks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
