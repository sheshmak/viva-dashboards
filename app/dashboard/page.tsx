"use client";

import { useEffect, useMemo, useState } from "react";
import { useGanttData } from "@/hooks/useSchedule";
import { Topbar } from "@/components/dashboard/Topbar";
import type { ScheduleProject, GanttZoom } from "@/app/dashboard/schedule/types";
import { todayStr } from "@/lib/dateUtils";
import {
  Filters, View, Density, EMPTY_FILTERS, LS_KEY, STATUS_ORDER, projectProgress,
} from "@/components/dashboard/consolidated/shared";
import { KpiStrip } from "@/components/dashboard/consolidated/KpiStrip";
import { FilterToolbar } from "@/components/dashboard/consolidated/FilterToolbar";
import { Gantt, type DepEdge } from "@/components/dashboard/consolidated/Gantt";
import { PortfolioGrid } from "@/components/dashboard/consolidated/PortfolioGrid";
import { OverviewView } from "@/components/dashboard/consolidated/OverviewView";
import { TasksTableView } from "@/components/dashboard/consolidated/TasksTableView";
import { DrillDownPanel } from "@/components/dashboard/consolidated/DrillDownPanel";

// ── URL state (shareable) ───────────────────────────────────────────────────
function encodeState(view: View, f: Filters): string {
  const p = new URLSearchParams();
  if (view !== "gantt") p.set("v", view);
  if (f.search) p.set("q", f.search);
  if (f.statuses.length) p.set("st", f.statuses.join(","));
  if (f.risks.length) p.set("rk", f.risks.join(","));
  if (f.departments.length) p.set("dp", f.departments.join(","));
  if (f.pastDueOnly) p.set("od", "1");
  if (f.group !== "none") p.set("g", f.group);
  if (f.sort !== "priority") p.set("s", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}
function decodeState(): { view?: View; filters?: Partial<Filters> } | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  if (![...p.keys()].length) return null;
  const f: Partial<Filters> = {};
  if (p.get("q")) f.search = p.get("q")!;
  if (p.get("st")) f.statuses = p.get("st")!.split(",");
  if (p.get("rk")) f.risks = p.get("rk")!.split(",");
  if (p.get("dp")) f.departments = p.get("dp")!.split(",");
  if (p.get("od")) f.pastDueOnly = true;
  if (p.get("g")) f.group = p.get("g") as Filters["group"];
  if (p.get("s")) f.sort = p.get("s") as Filters["sort"];
  return { view: (p.get("v") as View) || undefined, filters: f };
}

export default function ConsolidatedDashboard() {
  const [view, setView]       = useState<View>("gantt");
  const [zoom, setZoom]       = useState<GanttZoom>("year");
  const [density, setDensity] = useState<Density>("comfortable");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showDeps, setShowDeps] = useState(false);
  const [selected, setSelected] = useState<ScheduleProject | null>(null);
  const [restored, setRestored] = useState(false);

  // Restore: URL first, then localStorage.
  useEffect(() => {
    const url = decodeState();
    if (url) {
      if (url.view) setView(url.view);
      if (url.filters) setFilters(f => ({ ...f, ...url.filters }));
    } else {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.view) setView(s.view);
          if (s.zoom) setZoom(s.zoom);
          if (s.density) setDensity(s.density);
          if (typeof s.showDeps === "boolean") setShowDeps(s.showDeps);
          if (s.filters) setFilters({ ...EMPTY_FILTERS, ...s.filters });
        }
      } catch { /* ignore */ }
    }
    setRestored(true);
  }, []);

  // Persist + sync URL.
  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ view, zoom, density, showDeps, filters })); } catch { /* ignore */ }
    const qs = encodeState(view, filters);
    window.history.replaceState(null, "", window.location.pathname + qs);
  }, [view, zoom, density, showDeps, filters, restored]);

  const { data, isLoading, isError, error } = useGanttData();
  const projects = data?.projects ?? [];
  const phaseMap = data?.phaseMap ?? {};
  const dependencies: DepEdge[] = (data as { dependencies?: DepEdge[] })?.dependencies ?? [];

  const sorted = useMemo(() => {
    const arr = [...projects];
    arr.sort((a, b) => {
      switch (filters.sort) {
        case "number":    return (a.number ?? "").localeCompare(b.number ?? "");
        case "name":      return (a.name ?? a.title).localeCompare(b.name ?? b.title);
        case "endSoon":   return (a.endDate || "9999-99-99").localeCompare(b.endDate || "9999-99-99");
        case "startSoon": return (a.startDate || "9999-99-99").localeCompare(b.startDate || "9999-99-99");
        case "progress":  return projectProgress(a, phaseMap[a.id] ?? []) - projectProgress(b, phaseMap[b.id] ?? []);
        case "priority":
        default:          return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      }
    });
    return arr;
  }, [projects, filters.sort, phaseMap]);

  const filtered = useMemo(() => {
    return sorted.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !(p.number ?? "").toLowerCase().includes(q) && !(p.name ?? "").toLowerCase().includes(q)) return false;
      }
      if (filters.pastDueOnly && !p.isOverdue) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
      if (filters.risks.length > 0) {
        const r = (p.risk ?? "").trim();
        if (!filters.risks.some(k => r.startsWith(k))) return false;
      }
      if (filters.departments.length > 0) {
        const ph = phaseMap[p.id] ?? [];
        if (!filters.departments.some(d => ph.some(x => x.department === d))) return false;
      }
      return true;
    });
  }, [sorted, filters, phaseMap]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setSelected(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSelect(p: ScheduleProject) { setSelected(prev => prev?.id === p.id ? null : p); }

  function exportCsv() {
    const rows = [["Number", "Name", "Status", "Risk", "Start", "End", "Progress%", "Overdue"]];
    for (const p of filtered) {
      rows.push([
        p.number || "", (p.name || p.title).replace(/"/g, "'"), p.status, (p.risk || "").trim(),
        p.startDate || "", p.endDate || "", String(Math.round(projectProgress(p, phaseMap[p.id] ?? []) * 100)),
        p.isOverdue ? "Yes" : "No",
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `projects-${todayStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Topbar title="Consolidated Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#238636] border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-[color:var(--text-2)]">Loading portfolio from Wrike…</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Topbar title="Consolidated Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[13px] text-[#EF4444] font-semibold">Failed to load portfolio</p>
            <p className="text-[11px] text-[color:var(--text-3)] mt-1 max-w-xs">{error instanceof Error ? error.message : "Check your Wrike connection and refresh."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ marginRight: selected ? 380 : 0, transition: "margin-right 0.2s ease" }}>
      <Topbar title="Consolidated Dashboard" syncedAt={data?.syncedAt} />
      <KpiStrip projects={sorted} onPick={(patch) => setFilters(f => ({ ...f, ...patch }))} activeStatuses={filters.statuses} pastDueOnly={filters.pastDueOnly} />
      <FilterToolbar
        filters={filters} onFilters={setFilters}
        view={view} onView={setView}
        zoom={zoom} onZoom={setZoom}
        density={density} onDensity={setDensity}
        showDeps={showDeps} onShowDeps={setShowDeps}
        onExportCsv={exportCsv} onPrint={() => window.print()}
        total={sorted.length} visible={filtered.length}
      />

      <div className="flex-1 overflow-hidden" id="gantt-print-area">
        {view === "gantt" && (
          <Gantt projects={filtered} phaseMap={phaseMap} zoom={zoom} onZoom={setZoom} density={density} group={filters.group} showDeps={showDeps} dependencies={dependencies} onSelect={handleSelect} selectedId={selected?.id ?? null} />
        )}
        {view === "portfolio" && (
          <PortfolioGrid projects={filtered} phaseMap={phaseMap} group={filters.group} onSelect={handleSelect} selectedId={selected?.id ?? null} />
        )}
        {view === "overview" && <OverviewView projects={filtered} phaseMap={phaseMap} />}
        {view === "tasks" && <TasksTableView projects={projects} filters={filters} />}
      </div>

      {selected && <DrillDownPanel project={selected} phases={phaseMap[selected.id] ?? []} onClose={() => setSelected(null)} />}
    </div>
  );
}
