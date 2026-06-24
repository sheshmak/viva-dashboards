"use client";

import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { Filters } from "./shared";

export function KpiStrip({
  projects, onPick, activeStatuses, pastDueOnly,
}: {
  projects: ScheduleProject[];
  onPick: (patch: Partial<Filters>) => void;
  activeStatuses: string[];
  pastDueOnly: boolean;
}) {
  const onlyStatus = (s: string) => activeStatuses.length === 1 && activeStatuses[0] === s && !pastDueOnly;
  const stats: Array<{ label: string; value: number; color: string; patch: Partial<Filters>; active: boolean }> = [
    { label: "Total",     value: projects.length,                                      color: "var(--text-2)", patch: { statuses: [], pastDueOnly: false }, active: activeStatuses.length === 0 && !pastDueOnly },
    { label: "On Track",  value: projects.filter(p => p.status === "Green").length,     color: "#238636", patch: { statuses: ["Green"], pastDueOnly: false }, active: onlyStatus("Green") },
    { label: "At Risk",   value: projects.filter(p => p.status === "Yellow").length,    color: "#D97706", patch: { statuses: ["Yellow"], pastDueOnly: false }, active: onlyStatus("Yellow") },
    { label: "Off Track", value: projects.filter(p => p.status === "Red").length,       color: "#EF4444", patch: { statuses: ["Red"], pastDueOnly: false }, active: onlyStatus("Red") },
    { label: "Overdue",   value: projects.filter(p => p.isOverdue).length,              color: "#EF4444", patch: { statuses: [], pastDueOnly: true }, active: pastDueOnly },
    { label: "Completed", value: projects.filter(p => p.status === "Completed").length, color: "#3B82F6", patch: { statuses: ["Completed"], pastDueOnly: false }, active: onlyStatus("Completed") },
    { label: "On Hold",   value: projects.filter(p => p.status === "OnHold").length,    color: "#6B7280", patch: { statuses: ["OnHold"], pastDueOnly: false }, active: onlyStatus("OnHold") },
  ];
  return (
    <div className="flex items-center gap-1.5 px-5 py-2 border-b border-[var(--border)] bg-ground-2 flex-shrink-0 flex-wrap">
      {stats.map((s) => (
        <button
          key={s.label}
          onClick={() => onPick(s.patch)}
          title={`Filter: ${s.label}`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all"
          style={{
            borderColor: s.active ? s.color + "80" : "transparent",
            background: s.active ? s.color + "1A" : "transparent",
          }}
        >
          <span className="text-[14px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
          <span className="text-[10px] text-[color:var(--text-3)] uppercase tracking-wide">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
