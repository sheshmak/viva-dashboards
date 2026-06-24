"use client";

import { useMemo } from "react";
import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase } from "@/lib/wrike";
import { DEPT_COLORS, STATUS_COLORS } from "@/app/dashboard/schedule/types";
import { fmtYM, daysBetween, todayStr } from "@/lib/dateUtils";
import { GroupBy, StatusBadge, ProgressBar, projectProgress, groupOf } from "./shared";

function ProjectCard({ project, phases, onClick, isSelected }: {
  project: ScheduleProject; phases: DepartmentPhase[]; onClick: () => void; isSelected: boolean;
}) {
  const statusColor = STATUS_COLORS[project.status] ?? "#6B7280";
  const today = todayStr();
  const daysLeft = project.endDate ? daysBetween(today, project.endDate) : null;
  const pct = projectProgress(project, phases);

  return (
    <div onClick={onClick} className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{ background: isSelected ? "rgba(75,158,255,0.07)" : "var(--ground-2)", border: isSelected ? "1px solid rgba(75,158,255,0.4)" : "1px solid var(--border)", borderLeft: `3px solid ${statusColor}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[15px] font-black font-mono leading-none flex-shrink-0" style={{ color: "var(--link)" }}>{project.number || "—"}</span>
          <StatusBadge status={project.status} />
        </div>
        <div className="text-[12px] leading-snug mb-3 min-h-[32px]" style={{ color: "var(--text-soft)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {project.name || project.title}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="uppercase tracking-wide font-semibold" style={{ color: "var(--text-3)" }}>Progress</span>
            <span className="font-bold tabular-nums" style={{ color: "var(--text-2)" }}>{Math.round(pct * 100)}%</span>
          </div>
          <ProgressBar value={pct} color={statusColor} />
        </div>

        <div className="flex items-center gap-2 mb-3">
          {phases.length === 0 ? (
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>No phases</span>
          ) : phases.map(ph => (
            <span key={ph.department} title={`${ph.department}: ${ph.start} → ${ph.end}`} className="flex items-center gap-1 text-[9px] font-bold" style={{ color: DEPT_COLORS[ph.department] }}>
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: DEPT_COLORS[ph.department] }} />
              {ph.department === "Design & Engineering" ? "D&E" : ph.department}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>{fmtYM(project.startDate)} → {fmtYM(project.endDate)}</span>
          {daysLeft !== null && project.status !== "Completed" && project.status !== "Cancelled" && (
            <span className="text-[10px] font-bold" style={{ color: daysLeft < 0 ? "#EF4444" : daysLeft < 30 ? "#D97706" : "var(--text-3)" }}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PortfolioGrid({ projects, phaseMap, group, onSelect, selectedId }: {
  projects: ScheduleProject[];
  phaseMap: Record<string, DepartmentPhase[]>;
  group: GroupBy;
  onSelect: (p: ScheduleProject) => void;
  selectedId: string | null;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: ScheduleProject[] }>();
    for (const p of projects) {
      const g = groupOf(p, group);
      if (!map.has(g.key)) map.set(g.key, { label: g.label, items: [] });
      map.get(g.key)!.items.push(p);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [projects, group]);

  if (projects.length === 0) {
    return <div className="flex items-center justify-center h-full text-[13px]" style={{ color: "var(--text-3)" }}>No projects match the current filters.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {groups.map(g => (
        <div key={g.key}>
          {group !== "none" && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-2)" }}>{g.label}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--ground-3)", color: "var(--text-3)" }}>{g.items.length}</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(256px, 1fr))", gap: 10 }}>
            {g.items.map(p => (
              <ProjectCard key={p.id} project={p} phases={phaseMap[p.id] ?? []} onClick={() => onSelect(p)} isSelected={selectedId === p.id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
