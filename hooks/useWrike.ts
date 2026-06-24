import { useQuery } from "@tanstack/react-query";
import type { WrikeTask, WrikeFolder, WrikeContact, WrikeSpace } from "@/lib/wrike";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useMyTasks(status?: string) {
  return useQuery<WrikeTask[]>({
    queryKey: ["tasks", "me", status],
    queryFn: () =>
      fetchJSON<WrikeTask[]>(
        status ? `/api/wrike/tasks?status=${status}` : "/api/wrike/tasks"
      ),
  });
}

export function useContactTasks(contactId?: string) {
  return useQuery<WrikeTask[]>({
    queryKey: ["tasks", "contact", contactId],
    queryFn: () => fetchJSON<WrikeTask[]>(`/api/wrike/tasks?contactId=${contactId}`),
    enabled: !!contactId,
  });
}

export function useProjects() {
  return useQuery<WrikeFolder[]>({
    queryKey: ["projects"],
    queryFn: () => fetchJSON<WrikeFolder[]>("/api/wrike/projects"),
  });
}

export function useContacts() {
  return useQuery<WrikeContact[]>({
    queryKey: ["contacts"],
    queryFn: () => fetchJSON<WrikeContact[]>("/api/wrike/contacts"),
  });
}

export function useSpaces() {
  return useQuery<WrikeSpace[]>({
    queryKey: ["spaces"],
    queryFn: () => fetchJSON<WrikeSpace[]>("/api/wrike/spaces"),
  });
}
