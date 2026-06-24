import { unstable_cache } from "next/cache";
import { getWrikeClient } from "./getWrikeClient";

export const CACHE_TAG    = "wrike-data";
export const CACHE_TTL    = 4 * 60 * 60; // 4 hours in seconds

// ─── Gantt (projects + department phases) ────────────────────────────────────
export const getCachedGanttData = unstable_cache(
  async () => {
    const client = await getWrikeClient();
    const data   = await client.getGanttData();
    return { ...data, syncedAt: new Date().toISOString() };
  },
  ["wrike-gantt-data"],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG] }
);

// ─── All tasks in a date window ───────────────────────────────────────────────
export const getCachedAllTasks = unstable_cache(
  async (start: string, end: string) => {
    const client = await getWrikeClient();
    const [result, fields] = await Promise.all([
      client.getScheduleAllTasks({ scheduledStart: start, scheduledEnd: end }),
      client.getCustomFields().catch(() => [] as Array<{ id: string; title: string; type: string }>),
    ]);
    return {
      data:      result.tasks,
      fields,
      truncated: result.truncated,
      window:    { start, end },
      syncedAt:  new Date().toISOString(),
    };
  },
  ["wrike-all-tasks"],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG] }
);
