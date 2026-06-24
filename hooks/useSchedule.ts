import { useQuery } from "@tanstack/react-query";
import type { ScheduleProject } from "@/app/dashboard/schedule/types";
import type { DepartmentPhase, GanttData, WrikeTask } from "@/lib/wrike";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.error ?? json.message ?? text;
    } catch { /* keep raw text */ }
    throw new Error(message);
  }
  return res.json();
}

export function useScheduleProjects() {
  return useQuery<ScheduleProject[]>({
    queryKey: ["schedule", "projects"],
    queryFn: async () => {
      const json = await fetchJSON<{ data: ScheduleProject[] }>("/api/wrike/schedule/projects");
      const today = new Date().toISOString().slice(0, 10);
      return json.data.map((p) => ({
        ...p,
        phases: [],
        isOverdue:
          !!p.endDate &&
          p.endDate < today &&
          p.status !== "Completed" &&
          p.status !== "Cancelled",
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useGanttData() {
  return useQuery<{
    projects: ScheduleProject[];
    phaseMap: Record<string, DepartmentPhase[]>;
    syncedAt?: string;
  }>({
    queryKey: ["schedule", "gantt-data"],
    queryFn: async () => {
      const data = await fetchJSON<GanttData & { syncedAt?: string }>("/api/wrike/schedule/gantt-data");
      const t = new Date().toISOString().slice(0, 10);
      return {
        projects: data.projects.map((p) => ({
          ...p,
          phases: [],
          isOverdue:
            !!p.endDate &&
            p.endDate < t &&
            p.status !== "Completed" &&
            p.status !== "Cancelled",
        })),
        phaseMap: data.phaseMap,
        syncedAt: data.syncedAt,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectPhases(projectId: string | null) {
  return useQuery<DepartmentPhase[]>({
    queryKey: ["schedule", "phases", projectId],
    queryFn: async () => {
      const json = await fetchJSON<{ data: DepartmentPhase[] }>(
        `/api/wrike/schedule/phases?projectId=${projectId}`
      );
      return json.data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useScheduleTasks(opts?: { start?: string; end?: string }) {
  return useQuery<{
    tasks: WrikeTask[];
    fields: Array<{ id: string; title: string; type: string }>;
    truncated: boolean;
    window: { start: string; end: string };
  }>({
    queryKey: ["schedule", "all-tasks", opts?.start, opts?.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.start) params.set("start", opts.start);
      if (opts?.end)   params.set("end",   opts.end);
      const url = `/api/wrike/schedule/all-tasks${params.size ? "?" + params : ""}`;
      const json = await fetchJSON<{
        data: WrikeTask[];
        fields: Array<{ id: string; title: string; type: string }>;
        truncated: boolean;
        window: { start: string; end: string };
      }>(url);
      return {
        tasks:    json.data,
        fields:   json.fields,
        truncated: json.truncated ?? false,
        window:   json.window ?? { start: "", end: "" },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
