"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScheduleProject, GanttZoom } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase } from "@/lib/wrike";
import { DEPT_COLORS, STATUS_COLORS } from "@/app/dashboard/schedule/types";
import {
  parseDate, daysBetween, addDays, addMonths, todayStr, fmtYM,
  buildHeaderTicks, weekendBands,
} from "@/lib/dateUtils";
import {
  Density, GroupBy, PX_PER_DAY, DENSITY_ROW_H, DEPTS,
  projectProgress, groupOf,
} from "./shared";
import { GanttTooltip } from "./GanttTooltip";

export interface DepEdge { from: string; to: string }

const LEFT_W = 268;
const HEADER_H = 56;
const GROUP_H = 34;

function ganttRange(zoom: GanttZoom, projects: ScheduleProject[], phaseMap: Record<string, DepartmentPhase[]>): [string, string] {
  const t = todayStr();
  if (zoom === "12months") return [addMonths(t, -2), addMonths(t, 10)];
  const all = [
    ...projects.flatMap(p => [p.startDate, p.endDate]),
    ...projects.flatMap(p => (phaseMap[p.id] ?? []).flatMap(ph => [ph.start, ph.end])),
  ].filter(Boolean);
  if (!all.length) return [addMonths(t, -1), addMonths(t, 6)];
  const min = all.reduce((a, b) => (a < b ? a : b));
  const max = all.reduce((a, b) => (a > b ? a : b));
  const pad = zoom === "week" ? 28 : zoom === "year" ? 90 : 30;
  return [addDays(min, -pad), addDays(max, pad)];
}

export function Gantt({
  projects, phaseMap, zoom, onZoom, density, group, showDeps, dependencies,
  onSelect, selectedId,
}: {
  projects: ScheduleProject[];
  phaseMap: Record<string, DepartmentPhase[]>;
  zoom: GanttZoom;
  onZoom: (z: GanttZoom) => void;
  density: Density;
  group: GroupBy;
  showDeps: boolean;
  dependencies: DepEdge[];
  onSelect: (p: ScheduleProject) => void;
  selectedId: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = todayStr();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<{ p: ScheduleProject; x: number; y: number } | null>(null);

  const ROW_H = DENSITY_ROW_H[density];
  const BAR_H = density === "compact" ? 10 : 16;
  const BAR_GAP = density === "compact" ? 3 : 4;

  const [rs, re] = ganttRange(zoom, projects, phaseMap);
  const ppd = PX_PER_DAY[zoom];
  const totalDays = Math.max(30, daysBetween(rs, re));
  const tlW = totalDays * ppd;
  const todayOff = Math.max(0, daysBetween(rs, today)) * ppd;
  const { upper, lower } = useMemo(() => buildHeaderTicks(rs, re, ppd, zoom), [rs, re, ppd, zoom]);
  const weekends = useMemo(() => (zoom === "week" ? weekendBands(rs, re, ppd) : []), [rs, re, ppd, zoom]);

  // ── Group the (already filtered+sorted) projects ──────────────────────────
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: ScheduleProject[] }>();
    for (const p of projects) {
      const g = groupOf(p, group);
      if (!map.has(g.key)) map.set(g.key, { label: g.label, items: [] });
      map.get(g.key)!.items.push(p);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [projects, group]);

  // ── Layout pass: compute Y center + bar X for each project (for dep arrows) ─
  const layout = useMemo(() => {
    const pos = new Map<string, { y: number; xStart: number; xEnd: number }>();
    let y = 0;
    for (const g of groups) {
      if (group !== "none") y += GROUP_H;
      if (group !== "none" && collapsed.has(g.key)) continue;
      for (const p of g.items) {
        const xStart = LEFT_W + Math.max(0, daysBetween(rs, p.startDate || rs)) * ppd;
        const xEnd = LEFT_W + Math.max(0, daysBetween(rs, p.endDate || p.startDate || rs)) * ppd;
        pos.set(p.id, { y: y + ROW_H / 2, xStart, xEnd });
        y += ROW_H;
      }
    }
    return { pos, contentH: y };
  }, [groups, group, collapsed, rs, ppd, ROW_H]);

  function scrollToToday() {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayOff - 320);
  }
  useEffect(() => { const t = setTimeout(scrollToToday, 80); return () => clearTimeout(t); }, []); // eslint-disable-line

  function fitToScreen() {
    const avail = (scrollRef.current?.clientWidth ?? 1000) - LEFT_W - 24;
    const order: GanttZoom[] = ["week", "month", "quarter", "12months", "year"];
    let best: GanttZoom = "year";
    for (const z of order) {
      if (totalDays * PX_PER_DAY[z] <= avail) { best = z; break; }
    }
    onZoom(best);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const order: GanttZoom[] = ["year", "12months", "quarter", "month", "week"];
    const idx = order.indexOf(zoom);
    if (e.key === "ArrowLeft")  { scrollRef.current && (scrollRef.current.scrollLeft -= 120); }
    else if (e.key === "ArrowRight") { scrollRef.current && (scrollRef.current.scrollLeft += 120); }
    else if (e.key === "+" || e.key === "=") { if (idx < order.length - 1) onZoom(order[idx + 1]); }
    else if (e.key === "-" || e.key === "_") { if (idx > 0) onZoom(order[idx - 1]); }
    else return;
    e.preventDefault();
  }

  function toggleGroup(key: string) {
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  // Dependency arrows that connect two currently-visible project rows.
  const arrows = useMemo(() => {
    if (!showDeps) return [];
    return dependencies
      .map(e => {
        const a = layout.pos.get(e.from); const b = layout.pos.get(e.to);
        if (!a || !b) return null;
        return { x1: a.xEnd, y1: a.y, x2: b.xStart, y2: b.y };
      })
      .filter(Boolean) as { x1: number; y1: number; x2: number; y2: number }[];
  }, [showDeps, dependencies, layout]);

  return (
    <div className="flex flex-col h-full overflow-hidden" tabIndex={0} onKeyDown={onKeyDown} style={{ outline: "none" }}>
      {/* Legend + actions */}
      <div className="flex-shrink-0 flex items-center gap-4 px-4 py-1.5 bg-ground-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          {DEPTS.map(d => (
            <span key={d} className="flex items-center gap-1.5 text-[10px] text-[color:var(--text-2)]">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: DEPT_COLORS[d] }} />
              {d === "Design & Engineering" ? "D&E" : d}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[10px] text-[color:var(--text-3)]">
            <svg width="9" height="9" viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6" transform="rotate(45 5 5)" fill="var(--text-2)" /></svg>
            Milestone
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-[color:var(--text-3)] ml-2">
          <span className="inline-block w-4 h-1 rounded" style={{ background: "rgba(245,158,11,0.6)" }} />
          Today
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={fitToScreen} className="px-3 py-1 rounded-lg border border-[var(--border)] text-[11px] text-[color:var(--text-2)] hover:border-[var(--border-2)] transition-all">Fit</button>
          <button onClick={scrollToToday} className="px-3 py-1 rounded-lg border border-[var(--border)] text-[11px] text-[color:var(--text-2)] hover:border-[var(--border-2)] transition-all">Today</button>
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        <div style={{ minWidth: LEFT_W + tlW, position: "relative" }}>

          {/* Sticky two-row header */}
          <div className="sticky top-0 z-20 flex bg-ground-3 border-b border-[var(--border)]" style={{ height: HEADER_H }}>
            <div className="sticky left-0 z-30 flex-shrink-0 bg-ground-3 border-r border-[var(--border)] flex items-end pb-2 px-4" style={{ width: LEFT_W }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-3)]">Project</span>
            </div>
            <div className="relative flex-shrink-0" style={{ width: tlW }}>
              {/* upper: years */}
              {upper.map(t => (
                <div key={t.key} style={{ position: "absolute", left: t.offset, top: 0, height: HEADER_H / 2, width: t.width, borderLeft: "1px solid var(--border-2)", paddingLeft: 7, paddingTop: 5 }}>
                  <span className="whitespace-nowrap text-[11px] font-extrabold" style={{ color: "var(--text-2)" }}>{t.label}</span>
                </div>
              ))}
              {/* lower: months/weeks */}
              {lower.map(t => (
                <div key={t.key} style={{ position: "absolute", left: t.offset, top: HEADER_H / 2, height: HEADER_H / 2, width: t.width, borderLeft: "1px solid var(--border)", paddingLeft: 6, paddingTop: 5 }}>
                  <span className="whitespace-nowrap text-[10px] font-semibold" style={{ color: "var(--text-3)" }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dependency arrows overlay (timeline area) */}
          {arrows.length > 0 && (
            <svg className="absolute pointer-events-none" style={{ left: 0, top: HEADER_H, width: LEFT_W + tlW, height: layout.contentH, zIndex: 5 }}>
              <defs>
                <marker id="dep-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--link)" />
                </marker>
              </defs>
              {arrows.map((a, i) => {
                const midX = Math.max(a.x1 + 14, a.x2 - 14);
                return (
                  <path key={i}
                    d={`M ${a.x1} ${a.y1} H ${midX} V ${a.y2} H ${a.x2}`}
                    fill="none" stroke="var(--link)" strokeWidth={1.5} strokeOpacity={0.65} markerEnd="url(#dep-arrow)"
                  />
                );
              })}
            </svg>
          )}

          {/* Rows grouped */}
          {groups.map(g => {
            const isCollapsed = group !== "none" && collapsed.has(g.key);
            return (
              <div key={g.key}>
                {group !== "none" && (
                  <button
                    onClick={() => toggleGroup(g.key)}
                    className="sticky left-0 z-10 flex items-center gap-2 w-full px-4 bg-ground-3 border-b border-[var(--border)]"
                    style={{ height: GROUP_H }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      style={{ color: "var(--text-3)", transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform .15s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-2)" }}>{g.label}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--ground-2)", color: "var(--text-3)" }}>{g.items.length}</span>
                  </button>
                )}

                {!isCollapsed && g.items.map(project => {
                  const phases = phaseMap[project.id] ?? [];
                  const statusColor = STATUS_COLORS[project.status] ?? "#6B7280";
                  const isSelected = selectedId === project.id;
                  const isDimmed = hover && hover.p.id !== project.id;
                  const totalH = phases.length * BAR_H + Math.max(0, phases.length - 1) * BAR_GAP;
                  const groupTop = Math.max(6, (ROW_H - totalH) / 2);
                  const pct = Math.round(projectProgress(project, phases) * 100);

                  return (
                    <div
                      key={project.id}
                      className="flex border-b border-[var(--border)] cursor-pointer"
                      style={{ height: ROW_H, background: isSelected ? "rgba(75,158,255,0.08)" : undefined, opacity: isDimmed ? 0.5 : 1, transition: "opacity .12s" }}
                      onClick={() => onSelect(project)}
                      onMouseMove={(e) => setHover({ p: project, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setHover(null)}
                    >
                      {/* Left label */}
                      <div className="sticky left-0 z-[6] flex-shrink-0 flex flex-col justify-center px-3 gap-0.5 border-r border-[var(--border)]"
                        style={{ width: LEFT_W, height: ROW_H, background: isSelected ? "var(--ground-3)" : "var(--ground-2)", borderLeft: `3px solid ${statusColor}` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold leading-none font-mono" style={{ color: "var(--link)" }}>{project.number || "—"}</span>
                          {density !== "compact" && <span className="text-[9px] tabular-nums" style={{ color: "var(--text-3)" }}>{pct}%</span>}
                        </div>
                        <span className="text-[10px] truncate leading-snug" style={{ color: "var(--text-2)" }}>{project.name || project.title}</span>
                        {density !== "compact" && project.endDate && (
                          <span className="text-[9px] font-mono" style={{ color: "var(--text-3)" }}>{fmtYM(project.startDate)} → {fmtYM(project.endDate)}</span>
                        )}
                      </div>

                      {/* Timeline */}
                      <div className="relative flex-shrink-0" style={{ width: tlW, height: ROW_H }}>
                        {/* weekend shading (week zoom) */}
                        {weekends.map((w, i) => (
                          <div key={`we${i}`} style={{ position: "absolute", left: w.offset, top: 0, bottom: 0, width: w.width, background: "rgba(127,127,127,0.06)", pointerEvents: "none" }} />
                        ))}
                        {/* month grid lines */}
                        {lower.map(t => (
                          <div key={t.key} style={{ position: "absolute", left: t.offset, top: 0, bottom: 0, width: 1, background: "var(--border)", pointerEvents: "none" }} />
                        ))}
                        {/* today line */}
                        <div style={{ position: "absolute", left: todayOff, top: 0, bottom: 0, width: 1, background: "rgba(245,158,11,0.45)", zIndex: 1, pointerEvents: "none" }} />

                        {/* Phase bars with progress fill */}
                        {phases.map((ph, idx) => {
                          const color = DEPT_COLORS[ph.department];
                          const left = Math.max(0, daysBetween(rs, ph.start)) * ppd;
                          const width = Math.max(10, daysBetween(ph.start, ph.end)) * ppd;
                          const top = groupTop + idx * (BAR_H + BAR_GAP);
                          const done = ph.status === "completed";
                          const overdue = ph.end < today && !done;
                          // time-elapsed fraction for active phases
                          const span = Math.max(1, daysBetween(ph.start, ph.end));
                          const elapsed = Math.max(0, Math.min(1, daysBetween(ph.start, today) / span));
                          const fill = done ? 1 : elapsed;
                          return (
                            <div key={ph.department} title={`${ph.department}: ${ph.start} → ${ph.end}`}
                              style={{ position: "absolute", left, top, width, height: BAR_H, background: color + "26", border: overdue ? "1px solid #EF444488" : `1px solid ${color}66`, borderRadius: 3, zIndex: 2, overflow: "hidden" }}>
                              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: color + (done ? "AA" : "CC") }} />
                              {density !== "compact" && (
                                <span style={{ position: "absolute", left: 5, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: width - 8, zIndex: 1 }}>
                                  {ph.department === "Design & Engineering" ? "D&E" : ph.department}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {/* fallback bar */}
                        {phases.length === 0 && project.startDate && project.endDate && (
                          <div style={{ position: "absolute", left: Math.max(0, daysBetween(rs, project.startDate)) * ppd, top: ROW_H / 2 - 2, width: Math.max(4, daysBetween(project.startDate, project.endDate)) * ppd, height: 4, background: statusColor + "55", borderRadius: 2 }} />
                        )}

                        {/* milestone diamond at end date */}
                        {project.endDate && (
                          <div title={`End: ${project.endDate}`} style={{ position: "absolute", left: Math.max(0, daysBetween(rs, project.endDate)) * ppd - 5, top: ROW_H / 2 - 5, width: 10, height: 10, background: statusColor, transform: "rotate(45deg)", borderRadius: 2, zIndex: 3, border: "1px solid var(--ground-2)" }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="flex items-center justify-center py-16 text-[color:var(--text-3)] text-[13px]">No projects match the current filters.</div>
          )}
        </div>
      </div>

      {hover && <GanttTooltip project={hover.p} phases={phaseMap[hover.p.id] ?? []} x={hover.x} y={hover.y} />}
    </div>
  );
}
