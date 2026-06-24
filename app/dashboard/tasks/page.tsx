"use client";

import { Topbar } from "@/components/dashboard/Topbar";
import { useMyTasks } from "@/hooks/useWrike";
import { taskUrgency, formatDueDate } from "@/lib/wrike";
import { taskStatusChip } from "@/components/ui/Chip";
import { TaskRowSkeleton } from "@/components/ui/Skeleton";
import { useState, useMemo } from "react";
import type { WrikeTask } from "@/lib/wrike";
import { cn } from "@/lib/utils";

type FilterType = "All" | "Overdue" | "Today" | "Active" | "Completed" | "Deferred";
type SortType = "due" | "importance" | "title";

const IMPORTANCE_ORDER: Record<string, number> = { High: 0, Normal: 1, Low: 2 };

function ImportanceDot({ importance }: { importance: string }) {
  const color = importance === "High" ? "var(--red)" : importance === "Normal" ? "var(--accent)" : "var(--text-3)";
  return (
    <div
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color }}
      title={`${importance} importance`}
    />
  );
}

function TaskDetailRow({ task }: { task: WrikeTask }) {
  const urgency = taskUrgency(task);

  const dueColor = {
    overdue: "text-[var(--red)]",
    today: "text-[var(--accent)]",
    upcoming: "text-[#8B9BC0]",
    none: "text-[#5A6A94]",
  }[urgency];

  const dotColor = {
    overdue: "bg-[var(--red)] shadow-[0_0_5px_var(--red)]",
    today: "bg-[var(--accent)]",
    upcoming: "bg-[#5A6A94]",
    none: "bg-[#5A6A94]",
  }[urgency];

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] hover:bg-ground-3 transition-colors cursor-default group last:border-b-0">
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />

      <ImportanceDot importance={task.importance} />

      <span
        className={cn(
          "flex-1 text-[13.5px] font-medium truncate min-w-0",
          task.status === "Completed" && "line-through text-[#8B9BC0]"
        )}
      >
        {task.title}
      </span>

      {task.briefDescription && (
        <span className="hidden group-hover:block text-[12px] text-[#5A6A94] max-w-[200px] truncate">
          {task.briefDescription}
        </span>
      )}

      {taskStatusChip(task.status)}

      <span className={cn("font-mono text-[11px] w-[72px] text-right flex-shrink-0", dueColor)}>
        {task.dates?.due ? formatDueDate(task.dates.due) : "—"}
      </span>
    </div>
  );
}

const FILTERS: FilterType[] = ["All", "Overdue", "Today", "Active", "Completed", "Deferred"];

export default function TasksPage() {
  const { data: tasks, isLoading, isError } = useMyTasks();
  const [filter, setFilter] = useState<FilterType>("All");
  const [sort, setSort] = useState<SortType>("due");

  const filteredTasks = useMemo<WrikeTask[]>(() => {
    if (!tasks) return [];

    let filtered = tasks;
    if (filter === "Overdue") {
      filtered = tasks.filter((t) => t.status === "Active" && taskUrgency(t) === "overdue");
    } else if (filter === "Today") {
      filtered = tasks.filter((t) => t.status === "Active" && taskUrgency(t) === "today");
    } else if (filter === "Active") {
      filtered = tasks.filter((t) => t.status === "Active");
    } else if (filter === "Completed") {
      filtered = tasks.filter((t) => t.status === "Completed");
    } else if (filter === "Deferred") {
      filtered = tasks.filter((t) => t.status === "Deferred");
    }

    return [...filtered].sort((a, b) => {
      if (sort === "due") {
        const da = a.dates?.due ? new Date(a.dates.due).getTime() : Infinity;
        const db = b.dates?.due ? new Date(b.dates.due).getTime() : Infinity;
        return da - db;
      }
      if (sort === "importance") {
        return (IMPORTANCE_ORDER[a.importance] ?? 9) - (IMPORTANCE_ORDER[b.importance] ?? 9);
      }
      return a.title.localeCompare(b.title);
    });
  }, [tasks, filter, sort]);

  const counts = useMemo(() => {
    if (!tasks) return {} as Record<FilterType, number>;
    return {
      All: tasks.length,
      Overdue: tasks.filter((t) => t.status === "Active" && taskUrgency(t) === "overdue").length,
      Today: tasks.filter((t) => t.status === "Active" && taskUrgency(t) === "today").length,
      Active: tasks.filter((t) => t.status === "Active").length,
      Completed: tasks.filter((t) => t.status === "Completed").length,
      Deferred: tasks.filter((t) => t.status === "Deferred").length,
    };
  }, [tasks]);

  return (
    <div>
      <Topbar title="My Tasks" />

      <div className="p-8">
        {/* Filter + sort bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                  filter === f
                    ? "bg-ground-3 text-[#EEF0FF] border border-[var(--border-2)]"
                    : "text-[#8B9BC0] hover:text-[#EEF0FF] border border-transparent"
                )}
              >
                {f}
                {counts[f] !== undefined && counts[f] > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] opacity-60">{counts[f]}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#5A6A94]">
            <span>Sort:</span>
            {(["due", "importance", "title"] as SortType[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "px-2.5 py-1 rounded-md capitalize transition-all",
                  sort === s
                    ? "text-[#FFB020] bg-[var(--accent-dim)]"
                    : "hover:text-[#EEF0FF]"
                )}
              >
                {s === "due" ? "Due date" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div className="bg-ground-2 border border-[var(--border)] rounded-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-[var(--border-2)] bg-ground-3">
            <span className="w-2 flex-shrink-0" />
            <span className="w-1.5 flex-shrink-0" />
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-[#5A6A94]">Task</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6A94]">Status</span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-[#5A6A94] w-[72px] text-right">Due</span>
          </div>

          {isLoading && Array.from({ length: 8 }).map((_, i) => <TaskRowSkeleton key={i} />)}

          {isError && (
            <div className="px-6 py-10 text-center">
              <p className="text-[var(--red)] text-[13px]">Failed to load tasks.</p>
              <p className="text-[#5A6A94] text-[12px] mt-1">Check your Wrike connection and refresh.</p>
            </div>
          )}

          {!isLoading && !isError && filteredTasks.length === 0 && (
            <div className="px-6 py-12 text-center text-[#5A6A94] text-[13px]">
              No tasks match this filter.
            </div>
          )}

          {!isLoading && filteredTasks.map((task) => (
            <TaskDetailRow key={task.id} task={task} />
          ))}
        </div>

        {!isLoading && filteredTasks.length > 0 && (
          <p className="mt-3 text-right font-mono text-[11px] text-[#5A6A94]">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
