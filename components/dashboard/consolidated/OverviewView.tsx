"use client";

import { useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase } from "@/lib/wrike";
import { STATUS_COLORS, STATUS_LABELS } from "@/app/dashboard/schedule/types";
import { todayStr, addDays, parseDate } from "@/lib/dateUtils";
import { DEPTS, RISKS } from "./shared";

const CARD = "rounded-xl p-4";
const cardStyle = { background: "var(--ground-2)", border: "1px solid var(--border)" } as const;
const tooltipStyle = { background: "var(--ground-3)", border: "1px solid var(--border-2)", borderRadius: 8, fontSize: 12, color: "var(--text)" } as const;

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={CARD} style={cardStyle}>
      <div className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--text-3)" }}>{label}</div>
      <div className="text-[28px] font-black leading-none tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] mt-1.5" style={{ color: "var(--text-3)" }}>{sub}</div>}
    </div>
  );
}

export function OverviewView({ projects, phaseMap }: {
  projects: ScheduleProject[];
  phaseMap: Record<string, DepartmentPhase[]>;
}) {
  const today = todayStr();

  const stats = useMemo(() => {
    const active = projects.filter(p => p.status !== "Completed" && p.status !== "Cancelled").length;
    const overdue = projects.filter(p => p.isOverdue).length;
    const completed = projects.filter(p => p.status === "Completed").length;
    const atRisk = projects.filter(p => p.status === "Red" || p.status === "Yellow").length;

    const finished = projects.filter(p => p.status === "Completed" && p.completedDate && p.endDate);
    const onTime = finished.filter(p => (p.completedDate ?? "") <= p.endDate).length;
    const onTimePct = finished.length ? Math.round((onTime / finished.length) * 100) : null;

    const due = (days: number) => {
      const limit = addDays(today, days);
      return projects.filter(p => p.endDate && p.endDate >= today && p.endDate <= limit && p.status !== "Completed" && p.status !== "Cancelled").length;
    };
    return { active, overdue, completed, atRisk, onTimePct, finished: finished.length, d30: due(30), d60: due(60), d90: due(90) };
  }, [projects, today]);

  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach(p => counts.set(p.status, (counts.get(p.status) ?? 0) + 1));
    return [...counts.entries()].map(([status, value]) => ({ name: STATUS_LABELS[status] ?? status, value, color: STATUS_COLORS[status] ?? "#6B7280" }));
  }, [projects]);

  const riskData = useMemo(() => {
    return RISKS.map(r => ({
      name: r.label,
      value: projects.filter(p => (p.risk ?? "").trim().startsWith(r.key)).length,
      color: r.color,
    }));
  }, [projects]);

  const endingByMonth = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let i = 0; i < 8; i++) {
      const d = parseDate(addDays(today, i * 30));
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      buckets.set(key, 0);
    }
    projects.forEach(p => {
      if (!p.endDate || p.status === "Completed" || p.status === "Cancelled") return;
      const key = parseDate(p.endDate).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return [...buckets.entries()].map(([name, value]) => ({ name, value }));
  }, [projects, today]);

  const deptWorkload = useMemo(() => {
    return DEPTS.map(d => {
      let active = 0, overdue = 0;
      projects.forEach(p => {
        const ph = (phaseMap[p.id] ?? []).find(x => x.department === d);
        if (!ph) return;
        if (ph.status !== "completed") {
          active++;
          if (ph.end < today) overdue++;
        }
      });
      return { dept: d, active, overdue };
    });
  }, [projects, phaseMap, today]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KpiCard label="Active" value={stats.active} color="#238636" sub="in progress" />
        <KpiCard label="Overdue" value={stats.overdue} color="#EF4444" sub="past end date" />
        <KpiCard label="At Risk" value={stats.atRisk} color="#D97706" sub="off / at risk" />
        <KpiCard label="Completed" value={stats.completed} color="#3B82F6" sub="delivered" />
        <KpiCard label="On-Time" value={stats.onTimePct === null ? "—" : `${stats.onTimePct}%`} color="var(--link)" sub={stats.finished ? `of ${stats.finished} finished` : "no data"} />
      </div>

      {/* Deliverables due windows */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KpiCard label="Due in 30 days" value={stats.d30} color="var(--text)" />
        <KpiCard label="Due in 60 days" value={stats.d60} color="var(--text)" />
        <KpiCard label="Due in 90 days" value={stats.d90} color="var(--text)" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <div className={CARD} style={cardStyle}>
          <div className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-2)" }}>Status distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {statusData.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--ground-2)" />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {statusData.map(d => (
              <span key={d.name} className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-2)" }}>
                <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />{d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        <div className={CARD} style={cardStyle}>
          <div className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-2)" }}>Risk breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(127,127,127,0.08)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {riskData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={CARD} style={cardStyle}>
          <div className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-2)" }}>Projects ending by month</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={endingByMonth}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(127,127,127,0.08)" }} />
              <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={CARD} style={cardStyle}>
          <div className="text-[12px] font-semibold mb-3" style={{ color: "var(--text-2)" }}>Department workload</div>
          <div className="space-y-3 pt-2">
            {deptWorkload.map(d => {
              const max = Math.max(1, ...deptWorkload.map(x => x.active));
              return (
                <div key={d.dept}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span style={{ color: "var(--text-2)" }}>{d.dept}</span>
                    <span style={{ color: "var(--text-3)" }}>{d.active} active{d.overdue > 0 ? <span style={{ color: "#EF4444" }}> · {d.overdue} overdue</span> : null}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--ground-3)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(d.active / max) * 100}%`, background: "var(--primary)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
