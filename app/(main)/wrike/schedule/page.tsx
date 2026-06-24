"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ScheduleProject, DepartmentPhase } from "@/lib/wrike";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  Design:      "#6366f1",
  Engineering: "#3b82f6",
  Fabrication: "#f59e0b",
  Install:     "#10b981",
};

const STATUS_COLORS: Record<string, { bg: string; label: string }> = {
  Green:     { bg: "#22c55e", label: "On Track" },
  Yellow:    { bg: "#f59e0b", label: "At Risk" },
  Red:       { bg: "#ef4444", label: "Off Track" },
  Completed: { bg: "#6b7280", label: "Completed" },
  OnHold:    { bg: "#6b7280", label: "On Hold" },
  Cancelled: { bg: "#6b7280", label: "On Hold" },
  Custom:    { bg: "#4f6bed", label: "Active" },
};

const ZOOM_MONTHS: Record<string, number> = {
  "3M": 3, "6M": 6, "12M": 12, "2Y": 24,
};

type View = "gantt" | "dashboard" | "details";
type Zoom = keyof typeof ZOOM_MONTHS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtMon(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function statusInfo(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.Custom;
}

function exportCSV(projects: ScheduleProject[], phases: Record<string, DepartmentPhase[]>) {
  const rows = [
    ["#", "Project Name", "Start", "End", "Status", "Design Start", "Design End",
     "Engineering Start", "Engineering End", "Fabrication Start", "Fabrication End",
     "Install Start", "Install End"],
  ];
  for (const p of projects) {
    const ph = phases[p.id] ?? [];
    const get = (d: string) => ph.find((x) => x.department === d);
    rows.push([
      p.number, p.name, p.startDate, p.endDate, statusInfo(p.status).label,
      get("Design")?.start ?? "", get("Design")?.end ?? "",
      get("Engineering")?.start ?? "", get("Engineering")?.end ?? "",
      get("Fabrication")?.start ?? "", get("Fabrication")?.end ?? "",
      get("Install")?.start ?? "", get("Install")?.end ?? "",
    ]);
  }
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "viva-project-schedule.csv";
  a.click();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const { bg, label } = statusInfo(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: bg, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function PhaseLoadBtn({ projectId, onLoad }: { projectId: string; onLoad: (phases: DepartmentPhase[]) => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/wrike/schedule/phases?projectId=${projectId}`);
      const json = await res.json();
      if (json.data) { onLoad(json.data); setDone(true); }
    } finally { setLoading(false); }
  }

  if (done) return null;
  return (
    <button onClick={load} disabled={loading} style={{
      fontSize: 10, padding: "1px 6px", borderRadius: 4, border: "1px solid #2a3044",
      background: "transparent", color: "#4f6bed", cursor: "pointer", whiteSpace: "nowrap",
    }}>
      {loading ? "…" : "Load phases"}
    </button>
  );
}

// ─── Gantt View ───────────────────────────────────────────────────────────────

const LEFT_W = 270;
const ROW_H  = 64;
const HDR_H  = 36;
const LEG_H  = 28;
const DEPTS  = ["Design", "Engineering", "Fabrication", "Install"] as const;

function GanttView({
  projects,
  phases,
  onLoadPhases,
  zoom,
}: {
  projects: ScheduleProject[];
  phases: Record<string, DepartmentPhase[]>;
  onLoadPhases: (id: string, ph: DepartmentPhase[]) => void;
  zoom: Zoom;
}) {
  const today     = useMemo(() => new Date(), []);
  const tlStart   = useMemo(() => addMonths(today, -2), [today]);
  const totalMons = ZOOM_MONTHS[zoom];
  const tlEnd     = useMemo(() => addMonths(tlStart, totalMons + 2), [tlStart, totalMons]);
  const totalDays = daysBetween(tlStart, tlEnd);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll today into horizontal view on mount / zoom change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timelineEl = el.querySelector<HTMLElement>(".gantt-timeline");
    if (!timelineEl) return;
    const pct = daysBetween(tlStart, today) / totalDays;
    el.scrollLeft = pct * timelineEl.offsetWidth - el.clientWidth / 3;
  }, [tlStart, today, totalDays]);

  const months = useMemo(() => {
    const out: { label: string; pct: number }[] = [];
    const c = new Date(tlStart); c.setDate(1);
    while (c < tlEnd) {
      const pct = daysBetween(tlStart, c) / totalDays * 100;
      if (pct >= 0 && pct <= 100) out.push({ label: fmtMon(c), pct });
      c.setMonth(c.getMonth() + 1);
    }
    return out;
  }, [tlStart, tlEnd, totalDays]);

  const todayPct = daysBetween(tlStart, today) / totalDays * 100;

  function pbar(start: string, end: string, top: number, color: string, opacity: number) {
    const s = parseDate(start), e = parseDate(end);
    if (e < tlStart || s > tlEnd) return null;
    const cs = s < tlStart ? tlStart : s;
    const ce = e > tlEnd   ? tlEnd   : e;
    const l  = daysBetween(tlStart, cs) / totalDays * 100;
    const w  = Math.max(daysBetween(cs, ce) / totalDays * 100, 0.25);
    return { top, left: `${l}%`, width: `${w}%`, background: color, opacity } as React.CSSProperties & { top: number };
  }

  // Minimum timeline width based on zoom (wider for shorter periods)
  const minTlW = Math.max(800, totalMons <= 3 ? 1600 : totalMons <= 6 ? 1200 : 900);

  return (
    // Single overflow:auto container — horizontal + vertical scroll. Header + left col use sticky.
    <div ref={scrollRef} style={{ overflow: "auto", height: "100%", position: "relative" }}>
      <div style={{ minWidth: LEFT_W + minTlW, display: "flex", flexDirection: "column" }}>

        {/* Sticky top header row */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20, display: "flex",
          borderBottom: "1px solid #1e2538", background: "#0f1117",
        }}>
          {/* Corner: legend */}
          <div style={{
            width: LEFT_W, minWidth: LEFT_W, flexShrink: 0,
            position: "sticky", left: 0, zIndex: 21, background: "#0f1117",
            borderRight: "1px solid #1e2538", padding: "8px 12px",
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px",
            height: HDR_H + LEG_H,
          }}>
            {Object.entries(DEPT_COLORS).map(([d, c]) => (
              <span key={d} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#64748b" }}>
                <span style={{ width: 8, height: 5, borderRadius: 2, background: c, display: "inline-block" }} />{d}
              </span>
            ))}
          </div>

          {/* Month labels */}
          <div style={{ flex: 1, position: "relative", height: HDR_H + LEG_H }}>
            {months.map((m) => (
              <span key={m.label} style={{
                position: "absolute", left: `${m.pct}%`, top: 0, height: HDR_H,
                fontSize: 11, color: "#4a5568", paddingLeft: 6, display: "flex", alignItems: "center",
                borderLeft: "1px solid #1e2538",
              }}>{m.label}</span>
            ))}
          </div>
        </div>

        {/* Today line (spans full height, positioned absolutely) */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div style={{
            position: "absolute",
            top: HDR_H + LEG_H,
            bottom: 0,
            left: `calc(${LEFT_W}px + ${todayPct}%)`,
            width: 1,
            background: "#ef4444",
            opacity: 0.7,
            zIndex: 8,
            pointerEvents: "none",
          }}>
            <span style={{
              position: "sticky", top: HDR_H + LEG_H + 4,
              display: "block", left: 3, fontSize: 9, color: "#ef4444",
              background: "#0f1117", padding: "1px 3px", borderRadius: 2, whiteSpace: "nowrap",
            }}>Today</span>
          </div>
        )}

        {/* Project rows */}
        {projects.map((p) => {
          const ph     = phases[p.id] ?? [];
          const { bg } = statusInfo(p.status);
          const shadow = p.startDate && p.endDate ? pbar(p.startDate, p.endDate, 4, bg, 0.08) : null;

          return (
            <div key={p.id} style={{ display: "flex", borderBottom: "1px solid #1a2035" }}>
              {/* Sticky name cell */}
              <div style={{
                width: LEFT_W, minWidth: LEFT_W, flexShrink: 0,
                position: "sticky", left: 0, zIndex: 10,
                background: "#141824", borderRight: "1px solid #1e2538",
                height: ROW_H, padding: "0 12px",
                display: "flex", flexDirection: "column", justifyContent: "center", gap: 3,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <a href={p.permalink} target="_blank" rel="noreferrer"
                    style={{ color: "#7CB9FF", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {p.number}
                  </a>
                  <span style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {p.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusDot status={p.status} />
                  {!phases[p.id] && (
                    <PhaseLoadBtn projectId={p.id} onLoad={(ph) => onLoadPhases(p.id, ph)} />
                  )}
                </div>
              </div>

              {/* Timeline cell */}
              <div className="gantt-timeline" style={{ flex: 1, position: "relative", height: ROW_H }}>
                {/* Month grid lines */}
                {months.map((m) => (
                  <div key={m.label} style={{
                    position: "absolute", top: 0, bottom: 0, left: `${m.pct}%`,
                    width: 1, background: "#1a2538", opacity: 0.4, pointerEvents: "none",
                  }} />
                ))}

                {/* Shadow bar */}
                {shadow && <div style={{ position: "absolute", ...shadow, height: ROW_H - 8, borderRadius: 4 }} />}

                {/* Dept phase bars */}
                {ph.length > 0
                  ? ph.map((phase, i) => {
                      const lane = DEPTS.indexOf(phase.department as typeof DEPTS[number]);
                      if (lane < 0 || !phase.start || !phase.end) return null;
                      const bar = pbar(phase.start, phase.end, 10 + lane * 12, DEPT_COLORS[phase.department], phase.status === "completed" ? 0.4 : 0.9);
                      if (!bar) return null;
                      return <div key={i} style={{ position: "absolute", ...bar, height: 9, borderRadius: 3 }}
                        title={`${phase.department}: ${phase.start} → ${phase.end}`} />;
                    })
                  : p.startDate && p.endDate && (() => {
                      const bar = pbar(p.startDate, p.endDate, 24, bg, 0.5);
                      return bar ? <div style={{ position: "absolute", ...bar, height: 9, borderRadius: 3 }} /> : null;
                    })()
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard View ────────────────────────────────────────────────────────────

function DashboardView({ projects, phases }: { projects: ScheduleProject[]; phases: Record<string, DepartmentPhase[]> }) {
  const today = new Date();

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const label = statusInfo(p.status).label;
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return counts;
  }, [projects]);

  const ending30 = projects.filter((p) => {
    if (!p.endDate) return false;
    const d = parseDate(p.endDate);
    const diff = daysBetween(today, d);
    return diff >= 0 && diff <= 30;
  }).length;

  const overdue = projects.filter((p) => {
    if (!p.endDate || p.status === "Completed") return false;
    return parseDate(p.endDate) < today;
  }).length;

  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = { Design: 0, Engineering: 0, Fabrication: 0, Install: 0 };
    for (const ph of Object.values(phases)) {
      for (const d of ph) counts[d.department] = (counts[d.department] ?? 0) + 1;
    }
    return counts;
  }, [phases]);

  const statusEntries = [
    { label: "On Track",  color: "#22c55e", key: "On Track" },
    { label: "At Risk",   color: "#f59e0b", key: "At Risk" },
    { label: "Off Track", color: "#ef4444", key: "Off Track" },
    { label: "Completed", color: "#6b7280", key: "Completed" },
    { label: "On Hold",   color: "#475569", key: "On Hold" },
    { label: "Active",    color: "#4f6bed", key: "Active" },
  ];

  return (
    <div style={{ padding: "24px 28px", overflowY: "auto", height: "100%" }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Projects", value: projects.length, color: "#4f6bed" },
          { label: "On Track",       value: byStatus["On Track"] ?? 0, color: "#22c55e" },
          { label: "At Risk",        value: byStatus["At Risk"]  ?? 0, color: "#f59e0b" },
          { label: "Off Track",      value: byStatus["Off Track"] ?? 0, color: "#ef4444" },
          { label: "Ending in 30d",  value: ending30, color: "#a78bfa" },
          { label: "Overdue",        value: overdue, color: "#ef4444" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: "#1a1f2e", border: "1px solid #2a3044", borderRadius: 10,
            padding: "16px 18px",
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Status distribution */}
        <div style={{ background: "#1a1f2e", border: "1px solid #2a3044", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 14 }}>Status Distribution</div>
          {statusEntries.filter((e) => byStatus[e.key]).map((e) => {
            const count = byStatus[e.key] ?? 0;
            const pct = projects.length ? (count / projects.length * 100) : 0;
            return (
              <div key={e.key} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                  <span>{e.label}</span><span>{count}</span>
                </div>
                <div style={{ height: 6, background: "#0f1117", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: e.color, borderRadius: 3, transition: "width .4s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Phase coverage (projects with loaded phases) */}
        <div style={{ background: "#1a1f2e", border: "1px solid #2a3044", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 14 }}>
            Phase Coverage
            <span style={{ fontSize: 11, color: "#4a5568", marginLeft: 8 }}>
              ({Object.keys(phases).length} projects loaded)
            </span>
          </div>
          {Object.entries(DEPT_COLORS).map(([dept, color]) => {
            const count = phaseCounts[dept] ?? 0;
            const total = Object.keys(phases).length || 1;
            return (
              <div key={dept} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                  <span>{dept}</span><span>{count} projects</span>
                </div>
                <div style={{ height: 6, background: "#0f1117", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${count / total * 100}%`, background: color, borderRadius: 3, transition: "width .4s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Projects ending soon */}
        <div style={{ background: "#1a1f2e", border: "1px solid #2a3044", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 14 }}>Ending Soon (30 days)</div>
          {projects
            .filter((p) => p.endDate && daysBetween(today, parseDate(p.endDate)) >= 0 && daysBetween(today, parseDate(p.endDate)) <= 30)
            .slice(0, 8)
            .map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #1e2538" }}>
                <span style={{ fontSize: 12, color: "#c8d3e8" }}>{p.number} {p.name.slice(0, 30)}{p.name.length > 30 ? "…" : ""}</span>
                <span style={{ fontSize: 11, color: "#f59e0b" }}>{fmtShort(parseDate(p.endDate))}</span>
              </div>
            ))}
          {ending30 === 0 && <div style={{ fontSize: 12, color: "#4a5568" }}>None in the next 30 days</div>}
        </div>

        {/* Overdue projects */}
        <div style={{ background: "#1a1f2e", border: "1px solid #2a3044", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 14 }}>Overdue</div>
          {projects
            .filter((p) => p.endDate && p.status !== "Completed" && parseDate(p.endDate) < today)
            .slice(0, 8)
            .map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #1e2538" }}>
                <span style={{ fontSize: 12, color: "#c8d3e8" }}>{p.number} {p.name.slice(0, 30)}{p.name.length > 30 ? "…" : ""}</span>
                <span style={{ fontSize: 11, color: "#ef4444" }}>{fmtShort(parseDate(p.endDate))}</span>
              </div>
            ))}
          {overdue === 0 && <div style={{ fontSize: 12, color: "#4a5568" }}>No overdue projects</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Details View ──────────────────────────────────────────────────────────────

type SortKey = "number" | "name" | "startDate" | "endDate" | "status";

function DetailsView({
  projects,
  phases,
  onLoadPhases,
}: {
  projects: ScheduleProject[];
  phases: Record<string, DepartmentPhase[]>;
  onLoadPhases: (id: string, ph: DepartmentPhase[]) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(k); setSortDir(1); }
  }

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
  }, [projects, sortKey, sortDir]);

  const SortHdr = ({ k, label }: { k: SortKey; label: string }) => (
    <th onClick={() => toggleSort(k)} style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}>
      {label} {sortKey === k ? (sortDir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "16px 24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => exportCSV(sorted, phases)} style={{
          fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid #2a3044",
          background: "#1a1f2e", color: "#94a3b8", cursor: "pointer",
        }}>
          Export CSV
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#0f1117" }}>
              <SortHdr k="number" label="#" />
              <SortHdr k="name"   label="Project Name" />
              <SortHdr k="startDate" label="Start" />
              <SortHdr k="endDate"   label="End" />
              <SortHdr k="status" label="Status" />
              <th style={thStyle}>Design</th>
              <th style={thStyle}>Engineering</th>
              <th style={thStyle}>Fabrication</th>
              <th style={thStyle}>Install</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const ph = phases[p.id] ?? [];
              const get = (d: string) => ph.find((x) => x.department === d);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #1a2035" }}>
                  <td style={tdStyle}>
                    <a href={p.permalink} target="_blank" rel="noreferrer" style={{ color: "#7CB9FF", textDecoration: "none" }}>
                      {p.number}
                    </a>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                  <td style={tdStyle}>{p.startDate}</td>
                  <td style={tdStyle}>{p.endDate}</td>
                  <td style={tdStyle}><StatusDot status={p.status} /></td>
                  {(["Design","Engineering","Fabrication","Install"] as const).map((d) => {
                    const phase = get(d);
                    return (
                      <td key={d} style={tdStyle}>
                        {phase ? (
                          <span style={{ color: DEPT_COLORS[d], fontSize: 11 }}>
                            {phase.start}<br /><span style={{ color: "#4a5568" }}>→ {phase.end}</span>
                          </span>
                        ) : (
                          <span style={{ color: "#2a3044" }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={tdStyle}>
                    {!phases[p.id] && (
                      <PhaseLoadBtn projectId={p.id} onLoad={(ph) => onLoadPhases(p.id, ph)} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 500,
  borderBottom: "1px solid #1e2538", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "8px 12px", color: "#c8d3e8", verticalAlign: "middle",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [view, setView] = useState<View>("gantt");
  const [zoom, setZoom] = useState<Zoom>("12M");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const [allProjects, setAllProjects] = useState<ScheduleProject[]>([]);
  const [phases, setPhases] = useState<Record<string, DepartmentPhase[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "error">("live");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Load projects on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/wrike/schedule/projects");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setAllProjects(json.data ?? []);
        setSource(json.source ?? "live");
        setLastFetched(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
        setSource("error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLoadPhases = useCallback((id: string, ph: DepartmentPhase[]) => {
    setPhases((prev) => ({ ...prev, [id]: ph }));
  }, []);

  // Apply filters
  const filtered = useMemo(() => {
    const today = new Date();
    let list = allProjects;

    // Default: projects active in rolling 2-month window (unless user changes filters)
    if (!search && statusFilter === "all" && deptFilter === "all") {
      const windowStart = addMonths(today, -2);
      const windowEnd   = addMonths(today, 12);
      list = list.filter((p) => {
        if (!p.startDate || !p.endDate) return false;
        const s = parseDate(p.startDate);
        const e = parseDate(p.endDate);
        return s <= windowEnd && e >= windowStart;
      });
    } else {
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((p) => p.number.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
      }
      if (statusFilter !== "all") {
        list = list.filter((p) => statusInfo(p.status).label === statusFilter);
      }
      if (deptFilter !== "all") {
        list = list.filter((p) => {
          const ph = phases[p.id] ?? [];
          return ph.some((d) => d.department === deptFilter);
        });
      }
    }

    return list;
  }, [allProjects, search, statusFilter, deptFilter, phases]);

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    allProjects.forEach((p) => seen.add(statusInfo(p.status).label));
    return Array.from(seen).sort();
  }, [allProjects]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "Inter,system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{
        padding: "14px 24px", borderBottom: "1px solid #1e2538", background: "#141824",
        display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#e2e8f0" }}>
              VIVA Railings · Project Schedule
            </h1>
            <span style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 600,
              background: source === "live" ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.15)",
              color: source === "live" ? "#22c55e" : "#ef4444",
              border: `1px solid ${source === "live" ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`,
            }}>
              {source === "live" ? "● Live" : "⚠ Error"}
            </span>
            {lastFetched && (
              <span style={{ fontSize: 11, color: "#4a5568" }}>
                Updated {lastFetched.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#4a5568", marginTop: 2 }}>
            {loading ? "Loading…" : `${filtered.length} of ${allProjects.length} projects`}
          </div>
        </div>

        {/* View tabs */}
        <div style={{ display: "flex", gap: 2, background: "#0f1117", borderRadius: 8, padding: 3 }}>
          {(["gantt", "dashboard", "details"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500,
              background: view === v ? "#4f6bed" : "transparent",
              color: view === v ? "#fff" : "#64748b",
            }}>
              {v === "gantt" ? "Gantt" : v === "dashboard" ? "Dashboard" : "Details"}
            </button>
          ))}
        </div>

        {/* Zoom (Gantt only) */}
        {view === "gantt" && (
          <div style={{ display: "flex", gap: 2, background: "#0f1117", borderRadius: 8, padding: 3 }}>
            {(Object.keys(ZOOM_MONTHS) as Zoom[]).map((z) => (
              <button key={z} onClick={() => setZoom(z)} style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 500,
                background: zoom === z ? "#1e2538" : "transparent",
                color: zoom === z ? "#c8d3e8" : "#4a5568",
              }}>
                {z}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div style={{
        padding: "8px 24px", borderBottom: "1px solid #1e2538", background: "#141824",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by # or name…"
          style={{
            background: "#0f1117", border: "1px solid #2a3044", borderRadius: 7,
            padding: "6px 12px", fontSize: 13, color: "#e2e8f0", outline: "none", width: 220,
          }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={selectStyle}>
          <option value="all">All Departments</option>
          {Object.keys(DEPT_COLORS).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {(search || statusFilter !== "all" || deptFilter !== "all") && (
          <button onClick={() => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); }} style={{
            fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "1px solid #2a3044",
            background: "transparent", color: "#94a3b8", cursor: "pointer",
          }}>
            Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#4a5568" }}>
          {search || statusFilter !== "all" || deptFilter !== "all"
            ? "Filtered view"
            : "Showing active in ±2 month window · Search to see all"}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4a5568", fontSize: 14 }}>
            Loading projects from Wrike…
          </div>
        ) : error ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 10 }}>
            <div style={{ color: "#ef4444", fontSize: 14 }}>{error}</div>
            {error === "WRIKE_NOT_CONNECTED" && (
              <a href="/admin/connections" style={{ color: "#7CB9FF", fontSize: 13 }}>Connect Wrike →</a>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4a5568", fontSize: 14 }}>
            No projects match the current filters.
          </div>
        ) : view === "gantt" ? (
          <GanttView projects={filtered} phases={phases} onLoadPhases={handleLoadPhases} zoom={zoom} />
        ) : view === "dashboard" ? (
          <DashboardView projects={filtered} phases={phases} />
        ) : (
          <DetailsView projects={filtered} phases={phases} onLoadPhases={handleLoadPhases} />
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#0f1117", border: "1px solid #2a3044", borderRadius: 7,
  padding: "6px 10px", fontSize: 13, color: "#94a3b8", outline: "none", cursor: "pointer",
};
