import { useQuery } from "@tanstack/react-query";
import type { WrikeTask } from "@/lib/wrike";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Tasks inside a project folder (title, status, dates, responsibles, importance). */
export function useProjectTasks(projectId: string | null) {
  return useQuery<WrikeTask[]>({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const json = await fetchJSON<{ data: WrikeTask[] }>(`/api/wrike/projects/${projectId}/tasks`);
      return Array.isArray(json) ? (json as WrikeTask[]) : json.data ?? [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
