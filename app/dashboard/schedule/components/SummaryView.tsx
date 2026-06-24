"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ScheduleProject, DEPT_COLORS, STATUS_COLORS, STATUS_LABELS, FilterState } from "../types";

interface SummaryViewProps {
  projects: ScheduleProject[];
  filters: FilterState;
}

function KPICard({ label, value, sub, color }: { label: string; value: number | string; sub: string; color: string }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "var(--ground-2)",
        borderColor: color + "33",
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color }}>
        {label}
      </p>
      <p className="font-display text-[44px] font-bold leading-none mb-1.5" style={{ color }}>
        {value}
      </p>
      <p className="text-[12px] text-[#8B9BC0]">{sub}</p>
      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl" style={{ background: color }} />
    </div>
  );
}

export function SummaryView({ projects, filters }: SummaryViewProps) {
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filters.search && !p.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.pastDueOnly && !p.isOverdue) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
      return true;
    });
  }, [projects, filters]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const pastDue = filtered.filter((p) => p.isOverdue).length;
    const active = filtered.filter((p) => p.status !== "Completed" && p.status !== "Cancelled").length;
    const completed = filtered.filter((p) => p.status === "Completed").length;

    const byStatus = Object.entries(
      filtered.reduce<Record<string, number>>((acc, p) => {
        acc[p.status] = (acc[p.status] ?? 0) + 1;
        return acc;
      }, {})
    )
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const byDept = (["Design & Engineering", "Fabrication", "Install"] as const).map((dept) => {
      const deptProjects = filtered.filter((p) =>
        p.phases?.some((ph) => ph.department === dept)
      );
      const active = deptProjects.filter(
        (p) => p.status !== "Completed" && p.status !== "Cancelled"
      ).length;
      const overdue = deptProjects.filter((p) => p.isOverdue).length;
      return { dept, active, overdue };
    });

    const priorityData = [
      { label: "Green", count: filtered.filter((p) => p.status === "Green").length },
      { label: "Yellow", count: filtered.filter((p) => p.status === "Yellow").length },
      { label: "Red", count: filtered.filter((p) => p.status === "Red").length },
    ];

    return { total, pastDue, active, completed, byStatus, byDept, priorityData };
  }, [filtered]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-8 space-y-6 overflow-y-auto">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="relative rounded-2xl border p-5 overflow-hidden" style={{ background: "var(--ground-2)", borderColor: "rgba(35,134,54,0.3)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3 text-[#238636]">Active Projects</p>
          <p className="font-display text-[48px] font-bold leading-none mb-1.5 text-[#238636]">{stats.active}</p>
          <p className="text-[12px] text-[#8B9BC0]">of {stats.total} total</p>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#238636]" />
        </div>
        <div className="relative rounded-2xl border p-5 overflow-hidden" style={{ background: "var(--ground-2)", borderColor: "rgba(239,68,68,0.3)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3 text-[#EF4444]">Past Due</p>
          <p className="font-display text-[48px] font-bold leading-none mb-1.5 text-[#EF4444]">{stats.pastDue}</p>
          <p className="text-[12px] text-[#8B9BC0]">need attention</p>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#EF4444]" />
        </div>
        <div className="relative rounded-2xl border p-5 overflow-hidden" style={{ background: "var(--ground-2)", borderColor: "rgba(59,130,246,0.3)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3 text-[#3B82F6]">Completed</p>
          <p className="font-display text-[48px] font-bold leading-none mb-1.5 text-[#3B82F6]">{stats.completed}</p>
          <p className="text-[12px] text-[#8B9BC0]">this view</p>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#3B82F6]" />
        </div>
        <div className="relative rounded-2xl border p-5 overflow-hidden" style={{ background: "var(--ground-2)", borderColor: "rgba(217,119,6,0.3)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3 text-[#D97706]">At Risk</p>
          <p className="font-display text-[48px] font-bold leading-none mb-1.5 text-[#D97706]">
            {filtered.filter((p) => p.status === "Yellow" || p.status === "Red").length}
          </p>
          <p className="text-[12px] text-[#8B9BC0]">Yellow + Red status</p>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#D97706]" />
        </div>
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-2 gap-5">
        {/* Status breakdown */}
        <div className="bg-ground-2 border border-[var(--border)] rounded-2xl p-5">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8B9BC0] mb-4">
            Status Breakdown
          </p>
          <div className="space-y-2">
            {stats.byStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLORS[status] ?? "#6B7280" }}
                />
                <span className="text-[13px] flex-1">{STATUS_LABELS[status] ?? status}</span>
                <div className="flex-1 h-1.5 bg-ground-3 rounded overflow-hidden max-w-[120px]">
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{
                      width: `${(count / stats.total) * 100}%`,
                      background: STATUS_COLORS[status] ?? "#6B7280",
                    }}
                  />
                </div>
                <span className="font-mono text-[11px] text-[#8B9BC0] w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk / priority */}
        <div className="bg-ground-2 border border-[var(--border)] rounded-2xl p-5">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8B9BC0] mb-4">
            Risk Breakdown
          </p>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.priorityData} barSize={32}>
                <XAxis dataKey="label" tick={{ fill: "#8B9BC0", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8B9BC0", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--ground-3)",
                    border: "1px solid var(--border-2)",
                    borderRadius: 8,
                    color: "#EEF0FF",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.priorityData.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={entry.label === "Green" ? "#238636" : entry.label === "Yellow" ? "#D97706" : "#EF4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department capacity */}
      <div className="bg-ground-2 border border-[var(--border)] rounded-2xl p-5">
        <p className="font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8B9BC0] mb-4">
          Department Workload
        </p>
        <div className="grid grid-cols-4 gap-4">
          {stats.byDept.map(({ dept, active, overdue }) => (
            <div key={dept} className="bg-ground-3 rounded-xl p-4 text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{ background: DEPT_COLORS[dept] }}
              />
              <p className="font-display text-[13px] font-semibold mb-0.5" style={{ color: DEPT_COLORS[dept] }}>
                {dept}
              </p>
              <p className="font-display text-[28px] font-bold text-[#EEF0FF]">{active}</p>
              <p className="text-[10px] text-[#8B9BC0]">active projects</p>
              {overdue > 0 && (
                <p className="text-[10px] text-[#EF4444] mt-1">{overdue} past due</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Project list: at-risk */}
      <div className="bg-ground-2 border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8B9BC0]">
            Projects Needing Attention
          </p>
          <span className="chip-red text-[9px]">
            {filtered.filter((p) => p.isOverdue || p.status === "Red").length} flagged
          </span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {filtered
            .filter((p) => p.isOverdue || p.status === "Red" || p.status === "Yellow")
            .slice(0, 8)
            .map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-ground-3 transition-colors">
                <div
                  className="w-1 h-8 rounded flex-shrink-0"
                  style={{ background: STATUS_COLORS[p.status] ?? "#6B7280" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {p.number && <span className="text-[#5A6A94] mr-1.5">{p.number}</span>}
                    {p.name || p.title}
                  </p>
                  {p.endDate && (
                    <p className="text-[11px] text-[#5A6A94] mt-0.5">
                      Due: {p.endDate}
                      {p.isOverdue && (
                        <span className="ml-1.5 text-[#EF4444] font-semibold">OVERDUE</span>
                      )}
                    </p>
                  )}
                </div>
                <div
                  className="chip-base text-[9px]"
                  style={{
                    background: (STATUS_COLORS[p.status] ?? "#6B7280") + "22",
                    color: STATUS_COLORS[p.status] ?? "#6B7280",
                  }}
                >
                  {STATUS_LABELS[p.status] ?? p.status}
                </div>
              </div>
            ))}
          {filtered.filter((p) => p.isOverdue || p.status === "Red" || p.status === "Yellow").length === 0 && (
            <div className="px-5 py-8 text-center text-[#5A6A94] text-[13px]">
              No projects flagged. All on track.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
