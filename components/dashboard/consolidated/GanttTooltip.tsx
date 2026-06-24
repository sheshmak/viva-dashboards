"use client";

import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase } from "@/lib/wrike";
import { DEPT_COLORS, STATUS_COLORS, STATUS_LABELS } from "@/app/dashboard/schedule/types";
import { fmtDate, daysBetween, todayStr } from "@/lib/dateUtils";
import { projectProgress, riskMeta } from "./shared";

export function GanttTooltip({
  project, phases, x, y,
}: {
  project: ScheduleProject;
  phases: DepartmentPhase[];
  x: number;
  y: number;
}) {
  const statusColor = STATUS_COLORS[project.status] ?? "#6B7280";
  const today = todayStr();
  const daysLeft = project.endDate ? daysBetween(today, project.endDate) : null;
  const pct = Math.round(projectProgress(project, phases) * 100);
  const risk = riskMeta(project.risk);

  // Keep the card on-screen: flip to the left when near the right edge.
  const W = 300;
  const flip = typeof window !== "undefined" && x + W + 24 > window.innerWidth;
  const left = flip ? x - W - 16 : x + 16;
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 1000) - 260);

  return (
    <div
      className="fixed z-[70] pointer-events-none rounded-xl overflow-hidden"
      style={{
        left, top, width: W,
        background: "var(--ground-2)",
        border: "1px solid var(--border-2)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="px-4 pt-3 pb-2.5" style={{ borderTop: `3px solid ${statusColor}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-black font-mono" style={{ color: "var(--link)" }}>{project.number || "—"}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: statusColor + "22", color: statusColor }}>
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>
        <div className="text-[12px] text-[color:var(--text-soft)] leading-snug mt-1">{project.name || project.title}</div>
      </div>

      <div className="px-4 py-2.5 space-y-2.5" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[color:var(--text-3)] font-mono">{fmtDate(project.startDate)} → {fmtDate(project.endDate)}</span>
          {daysLeft !== null && project.status !== "Completed" && project.status !== "Cancelled" && (
            <span className="font-bold" style={{ color: daysLeft < 0 ? "#EF4444" : daysLeft < 30 ? "#D97706" : "#238636" }}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
            </span>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-[color:var(--text-3)] uppercase tracking-wide font-semibold">Progress</span>
            <span className="font-bold tabular-nums" style={{ color: "var(--text-2)" }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ground-3)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: statusColor }} />
          </div>
        </div>

        {risk && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: risk.color }} />
            <span style={{ color: risk.color }} className="font-semibold">{risk.label}</span>
          </div>
        )}

        {phases.length > 0 && (
          <div className="space-y-1 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
            {phases.map(ph => (
              <div key={ph.department} className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold" style={{ color: DEPT_COLORS[ph.department] }}>
                  <span className="w-2 h-2 rounded-sm" style={{ background: DEPT_COLORS[ph.department] }} />
                  {ph.department === "Design & Engineering" ? "D&E" : ph.department}
                </span>
                <span className="font-mono text-[color:var(--text-3)]">{fmtDate(ph.start)} → {fmtDate(ph.end)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
