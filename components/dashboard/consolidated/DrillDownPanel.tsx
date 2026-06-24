"use client";

import { useMemo, useState } from "react";
import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase, WrikeContact } from "@/lib/wrike";
import { DEPT_COLORS, STATUS_COLORS } from "@/app/dashboard/schedule/types";
import { fmtDate, daysBetween, todayStr } from "@/lib/dateUtils";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useContacts } from "@/hooks/useWrike";
import { StatusBadge, ProgressBar, projectProgress, riskMeta } from "./shared";

function initials(c?: WrikeContact): string {
  if (!c) return "?";
  return ((c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "")).toUpperCase() || "?";
}

export function DrillDownPanel({ project, phases, onClose }: {
  project: ScheduleProject; phases: DepartmentPhase[]; onClose: () => void;
}) {
  const statusColor = STATUS_COLORS[project.status] ?? "#6B7280";
  const today = todayStr();
  const daysLeft = project.endDate ? daysBetween(today, project.endDate) : null;
  const risk = riskMeta(project.risk);
  const [tab, setTab] = useState<"phases" | "tasks">("phases");

  const { data: tasks, isLoading } = useProjectTasks(project.id);
  const { data: contacts } = useContacts();
  const contactMap = useMemo(() => {
    const m = new Map<string, WrikeContact>();
    (contacts ?? []).forEach(c => m.set(c.id, c));
    return m;
  }, [contacts]);

  const taskStats = useMemo(() => {
    const t = tasks ?? [];
    const overdue = t.filter(x => x.dates?.due && x.dates.due < today && x.status !== "Completed" && x.status !== "Cancelled").length;
    const done = t.filter(x => x.status === "Completed").length;
    return { total: t.length, overdue, done };
  }, [tasks, today]);

  const sortedTasks = useMemo(() => {
    return [...(tasks ?? [])].sort((a, b) => (a.dates?.due || "9999").localeCompare(b.dates?.due || "9999"));
  }, [tasks]);

  // Prefer true task completion (loaded on demand) over schedule-progress estimate.
  const taskPct = taskStats.total > 0 ? taskStats.done / taskStats.total : null;
  const pct = taskPct ?? projectProgress(project, phases);
  const pctLabel = taskPct !== null ? `${taskStats.done}/${taskStats.total} tasks` : "schedule";

  return (
    <div className="fixed right-0 top-0 bottom-0 flex flex-col z-50"
      style={{ width: 380, background: "var(--ground-2)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
      {/* Header */}
      <div className="flex items-start gap-3 p-5 border-b border-[var(--border)]" style={{ borderTop: `3px solid ${statusColor}` }}>
        <div className="flex-1 min-w-0">
          <div className="text-[24px] font-black leading-none mb-1.5 font-mono" style={{ color: "var(--link)" }}>{project.number || "—"}</div>
          <div className="text-[12px] leading-snug" style={{ color: "var(--text-soft)" }}>{project.name || project.title}</div>
        </div>
        <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-ground-3 transition-all" style={{ color: "var(--text-3)" }} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {/* Status + dates + progress */}
      <div className="p-5 border-b border-[var(--border)] space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={project.status} />
          {project.isOverdue && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>Overdue</span>}
          {risk && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: risk.color + "22", color: risk.color }}>{risk.label}</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><div className="text-[10px] uppercase tracking-wider mb-1 font-semibold" style={{ color: "var(--text-3)" }}>Start</div><div className="text-[13px]" style={{ color: "var(--text-soft)" }}>{fmtDate(project.startDate)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wider mb-1 font-semibold" style={{ color: "var(--text-3)" }}>End</div><div className="text-[13px]" style={{ color: "var(--text-soft)" }}>{fmtDate(project.endDate)}</div></div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="uppercase tracking-wider font-semibold" style={{ color: "var(--text-3)" }}>Progress · {pctLabel}</span>
            <span className="font-bold tabular-nums" style={{ color: "var(--text-2)" }}>{Math.round(pct * 100)}%</span>
          </div>
          <ProgressBar value={pct} color={statusColor} />
        </div>
        {daysLeft !== null && project.status !== "Completed" && project.status !== "Cancelled" && (
          <div className="text-[12px] font-bold" style={{ color: daysLeft < 0 ? "#EF4444" : daysLeft < 30 ? "#D97706" : "#238636" }}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? "Due today" : `${daysLeft} days remaining`}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
        {(["phases", "tasks"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={{ background: tab === t ? "var(--ground-3)" : "transparent", color: tab === t ? "var(--text)" : "var(--text-3)" }}>
            {t === "phases" ? "Phases" : `Tasks${taskStats.total ? ` (${taskStats.total})` : ""}`}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="p-5 flex-1 overflow-y-auto">
        {tab === "phases" ? (
          phases.length === 0 ? (
            <div className="text-[12px]" style={{ color: "var(--text-3)" }}>No department phases found for this project.</div>
          ) : (
            <div className="space-y-4">
              {phases.map(ph => {
                const color = DEPT_COLORS[ph.department];
                const isPhaseOverdue = ph.end < today && ph.status !== "completed";
                const span = Math.max(1, daysBetween(ph.start, ph.end));
                const progress = ph.status === "completed" ? 1 : Math.max(0, Math.min(1, daysBetween(ph.start, today) / span));
                return (
                  <div key={ph.department}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color }}>
                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />{ph.department}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {ph.status === "completed" && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: "#3B82F6", background: "rgba(59,130,246,0.15)" }}>Done</span>}
                        {isPhaseOverdue && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: "#EF4444", background: "rgba(239,68,68,0.15)" }}>Overdue</span>}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono mb-2" style={{ color: "var(--text-2)" }}>{fmtDate(ph.start)} → {fmtDate(ph.end)}</div>
                    <ProgressBar value={progress} color={color} />
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div>
            {isLoading ? (
              <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading tasks…</div>
            ) : !sortedTasks.length ? (
              <div className="text-[12px]" style={{ color: "var(--text-3)" }}>No tasks found in this project.</div>
            ) : (
              <>
                <div className="flex gap-3 mb-3 text-[11px]">
                  <span style={{ color: "var(--text-2)" }}><b>{taskStats.done}</b> done</span>
                  <span style={{ color: "#EF4444" }}><b>{taskStats.overdue}</b> overdue</span>
                  <span style={{ color: "var(--text-3)" }}>{taskStats.total} total</span>
                </div>
                <div className="space-y-1.5">
                  {sortedTasks.slice(0, 80).map(t => {
                    const overdue = t.dates?.due && t.dates.due < today && t.status !== "Completed" && t.status !== "Cancelled";
                    const tColor = t.status === "Completed" ? "#3B82F6" : overdue ? "#EF4444" : "var(--text-soft)";
                    const resp = (t.responsibleIds ?? []).map(id => contactMap.get(id)).filter(Boolean) as WrikeContact[];
                    return (
                      <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--ground-3)" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] truncate" style={{ color: "var(--text-soft)" }}>{t.title}</div>
                          {t.dates?.due && <div className="text-[10px] font-mono" style={{ color: overdue ? "#EF4444" : "var(--text-3)" }}>{fmtDate(t.dates.due)}</div>}
                        </div>
                        <div className="flex -space-x-1.5 flex-shrink-0">
                          {resp.slice(0, 3).map(c => (
                            <span key={c.id} title={`${c.firstName} ${c.lastName}`} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: "var(--primary)", border: "1px solid var(--ground-2)" }}>{initials(c)}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {sortedTasks.length > 80 && <div className="text-[10px] text-center pt-2" style={{ color: "var(--text-3)" }}>+{sortedTasks.length - 80} more</div>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-[var(--border)]">
        {project.permalink ? (
          <a href={project.permalink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-[13px] font-semibold transition-all hover:bg-ground-3"
            style={{ borderColor: "var(--border-2)", color: "var(--link)" }}>
            Open in Wrike
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          </a>
        ) : <div className="text-[12px] text-center" style={{ color: "var(--text-3)" }}>No Wrike link available</div>}
      </div>
    </div>
  );
}
