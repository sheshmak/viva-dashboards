const WRIKE_BASE = "https://www.wrike.com/api/v4";

export class WrikeClient {
  private token: string;

  constructor(accessToken: string) {
    this.token = accessToken;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${WRIKE_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.errorDescription ?? err.error ?? `Wrike API error ${res.status}`);
    }

    return res.json();
  }

  /** Current user profile */
  async getMe(): Promise<WrikeContact[]> {
    const res = await this.get<{ data: WrikeContact[] }>("/contacts", { me: "true" });
    return res.data;
  }

  /** All contacts in the account (team members) */
  async getContacts(): Promise<WrikeContact[]> {
    const res = await this.get<{ data: WrikeContact[] }>("/contacts");
    return res.data;
  }

  /** Tasks assigned to the current user */
  async getMyTasks(params?: {
    status?: string;
    startDate?: string;
    dueDate?: string;
  }): Promise<WrikeTask[]> {
    const query: Record<string, string> = {
      assignees: "me",
      // Only request optional fields — defaults (status, importance, dates, etc.) come automatically
      fields: '["description","briefDescription","recurrent","attachmentCount","metadata","customFields","effortAllocation"]',
      sortField: "DueDate",
      sortOrder: "Asc",
    };

    if (params?.status) query.status = params.status;
    if (params?.startDate) query["scheduledDate[start]"] = params.startDate;
    if (params?.dueDate) query["scheduledDate[end]"] = params.dueDate;

    const res = await this.get<{ data: WrikeTask[] }>("/tasks", query);
    return res.data;
  }

  /** Tasks in a specific folder/project.
   *  Note: status/dates/parentIds/importance are DEFAULT fields and must NOT be
   *  listed in `fields` (Wrike rejects default fields there). Only request
   *  genuinely optional fields like responsibleIds. */
  async getFolderTasks(folderId: string): Promise<WrikeTask[]> {
    const res = await this.get<{ data: WrikeTask[] }>(
      `/folders/${folderId}/tasks`,
      {
        descendants: "true",
        pageSize: "1000",
        fields: '["responsibleIds"]',
      }
    );
    return res.data;
  }

  /** All folders/projects visible to the user */
  async getFolders(): Promise<WrikeFolder[]> {
    const res = await this.get<{ data: WrikeFolder[] }>("/folders", {
      fields: '["description","briefDescription","project","space","metadata"]',
    });
    return res.data.filter((f) => f.project != null);
  }

  /** Projects only (folders with project data) */
  async getProjects(): Promise<WrikeFolder[]> {
    const res = await this.get<{ data: WrikeFolder[] }>("/folders", {
      // request project field to get project metadata; filter client-side
      fields: '["description","briefDescription","project","space","metadata"]',
    });
    return res.data.filter((f) => f.project != null);
  }

  /** All spaces */
  async getSpaces(): Promise<WrikeSpace[]> {
    const res = await this.get<{ data: WrikeSpace[] }>("/spaces", {
      fields: '["members","avatarUrl","description"]',
    });
    return res.data;
  }

  /** Folders within a space */
  async getSpaceFolders(spaceId: string): Promise<WrikeFolder[]> {
    const res = await this.get<{ data: WrikeFolder[] }>(`/spaces/${spaceId}/folders`, {
      fields: '["project","stats","permalink"]',
    });
    return res.data;
  }

  /** Workflows in the account */
  async getWorkflows(): Promise<WrikeWorkflow[]> {
    const res = await this.get<{ data: WrikeWorkflow[] }>("/workflows");
    return res.data;
  }

  /** All projects in the VIVA Railings schedule folder.
   *  The /folders/{id}/folders endpoint returns a folderTree (all descendants)
   *  and does not support pageSize. We filter to direct children only.
   *  Dates are not available via the `project` field on this account, so they
   *  are left empty here and computed lazily via getProjectPhases() on expand. */
  async getAllScheduleProjects(): Promise<ScheduleProject[]> {
    const res = await this.get<{ data: WrikeFolder[] }>(
      `/folders/${VIVA_SCHEDULE_FOLDER}/folders`
    );

    // Keep only direct children of the schedule folder
    const directChildren = res.data.filter((f) =>
      f.parentIds?.includes(VIVA_SCHEDULE_FOLDER)
    );

    return directChildren.map((f) => {
      const num = extractProjectNumber(f.title);
      return {
        id: f.id,
        title: f.title,
        number: num,
        name: cleanProjectName(f.title, num),
        permalink: f.permalink ?? "",
        startDate: "",
        endDate: "",
        status: "Green",
        completedDate: undefined,
      };
    });
  }

  /** Department phase date-ranges for one project.
   *  Uses a single tasks call (descendants=true) instead of multi-hop folder
   *  traversal — more reliable when the `project` field is unavailable. */
  async getProjectPhases(projectId: string): Promise<DepartmentPhase[]> {
    const res = await this.get<{ data: WrikeTask[] }>(
      `/folders/${projectId}/tasks`,
      { descendants: "true", pageSize: "1000" }
    );
    const allTasks = res.data.filter(
      (t) => t.dates?.start && t.dates?.due
    );

    const phases: DepartmentPhase[] = [];
    for (const { department, keywords } of DEPT_KEYWORDS) {
      const matching = allTasks.filter((t) =>
        keywords.some((k) => t.title.toUpperCase().includes(k))
      );
      if (!matching.length) continue;

      const starts = matching.map((t) => new Date(t.dates.start!).getTime());
      const ends   = matching.map((t) => new Date(t.dates.due!).getTime());
      phases.push({
        department,
        start: new Date(Math.min(...starts)).toISOString().slice(0, 10),
        end:   new Date(Math.max(...ends)).toISOString().slice(0, 10),
        status: matching.every((t) => t.status === "Completed") ? "completed" : "active",
      });
    }
    return phases;
  }

  /** Load all projects AND their department phases in 2 API calls.
   *  Call 1: full folder tree  →  project list + folder→project map
   *  Call 2: all tasks (descendants)  →  grouped by project, dept phases computed */
  async getGanttData(): Promise<GanttData> {
    // ── Call 1: root folder → get direct child IDs ───────────────────────────
    const rootRes = await this.get<{ data: WrikeFolder[] }>(
      `/folders/${VIVA_SCHEDULE_FOLDER}`
    );
    const rootChildIds = new Set<string>(rootRes.data[0]?.childIds ?? []);

    // ── Call 2: full folder tree (with custom fields for Risk) ──────────────
    const foldersRes = await this.get<{ data: WrikeFolder[] }>(
      `/folders/${VIVA_SCHEDULE_FOLDER}/folders`,
      { fields: '["customFields"]' }
    );

    const directProjects = foldersRes.data.filter((f) => rootChildIds.has(f.id));

    console.log("[getGanttData] tree:", foldersRes.data.length, "| direct:", directProjects.length);
    // Log a sample project's child folder titles so we can see the actual subfolder naming
    if (directProjects.length > 0) {
      const s = directProjects[0];
      console.log("[getGanttData] sample project:", s.title, "| childIds:", s.childIds?.length ?? 0);
    }

    if (!directProjects.length) return { projects: [], phaseMap: {} };

    const projectIds = new Set(directProjects.map((f) => f.id));

    // Build child→parent map from childIds (folderTree omits parentIds)
    const parentOf = new Map<string, string>();
    for (const f of foldersRes.data) {
      for (const childId of f.childIds ?? []) parentOf.set(childId, f.id);
    }

    // Walk up parentOf to assign every sub-folder to its root project (with path compression)
    const folderToProject = new Map<string, string>();
    for (const id of projectIds) folderToProject.set(id, id);

    for (const f of foldersRes.data) {
      if (folderToProject.has(f.id)) continue;
      const path: string[] = [f.id];
      let cur = parentOf.get(f.id);
      while (cur && !folderToProject.has(cur)) { path.push(cur); cur = parentOf.get(cur); }
      if (cur && folderToProject.has(cur)) {
        const proj = folderToProject.get(cur)!;
        for (const id of path) folderToProject.set(id, proj);
      }
    }

    // ── Call 2: all tasks (paginated) ────────────────────────────────────────
    const allTasks: WrikeTask[] = [];
    let nextPageToken: string | undefined;
    do {
      const params: Record<string, string> = {
        descendants: "true",
        pageSize: "1000",
        fields: '["dependencyIds","responsibleIds","superParentIds"]',
      };
      if (nextPageToken) params.nextPageToken = nextPageToken;
      const res = await this.get<{ data: WrikeTask[]; nextPageToken?: string }>(
        `/folders/${VIVA_SCHEDULE_FOLDER}/tasks`,
        params
      );
      allTasks.push(...res.data);
      nextPageToken = res.nextPageToken;
    } while (nextPageToken);

    // ── Group tasks by project ───────────────────────────────────────────────
    const projectTaskMap = new Map<string, WrikeTask[]>();
    for (const task of allTasks) {
      // Try parentIds first; Wrike tasks store containing folder in parentIds
      const folderIds = [
        ...(task.parentIds ?? []),
        ...(task.superParentIds ?? []),
      ];
      for (const fid of folderIds) {
        const pid = folderToProject.get(fid);
        if (pid) {
          if (!projectTaskMap.has(pid)) projectTaskMap.set(pid, []);
          projectTaskMap.get(pid)!.push(task);
          break;
        }
      }
    }

    // ── Build output ─────────────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const projects: ScheduleProject[] = [];
    const phaseMap: Record<string, DepartmentPhase[]> = {};
    for (const id of projectIds) phaseMap[id] = [];

    // Map every department subfolder ID → { projectId, department }.
    // Also extract the folder's own project dates (startDate/endDate) when present —
    // these are the dates Wrike displays for the subfolder in timeline/list views.
    const folderToDept = new Map<string, { projectId: string; department: DepartmentPhase["department"] }>();

    for (const f of foldersRes.data) {
      if (projectIds.has(f.id)) continue;
      const projId = folderToProject.get(f.id);
      if (!projId) continue;
      const ft = f.title.toUpperCase();
      for (const [dept, keywords] of Object.entries(DEPT_FOLDER_MATCH) as Array<[DepartmentPhase["department"], string[]]>) {
        if (!keywords.some((k) => ft.includes(k))) continue;
        folderToDept.set(f.id, { projectId: projId, department: dept });

        // Use this subfolder's own project dates if Wrike has them set.
        // These are the dates shown in Wrike when you look at the subfolder.
        const sd = f.project?.startDate ?? "";
        const ed = f.project?.endDate   ?? "";
        if (sd && ed && !phaseMap[projId].some((p) => p.department === dept)) {
          phaseMap[projId].push({
            department: dept,
            start:  sd,
            end:    ed,
            status: f.project?.status === "Completed" ? "completed" : "active",
          });
        }
        break;
      }
    }

    // ── DEBUG: show what we found ──────────────────────────────────────────────
    console.log("[getGanttData] dept folders found:", folderToDept.size);
    // Show up to 5 actual subfolder titles so we can verify keyword matching
    const deptSamples = [...foldersRes.data]
      .filter((f) => !projectIds.has(f.id) && folderToProject.get(f.id))
      .slice(0, 20)
      .map((f) => f.title);
    console.log("[getGanttData] non-project subfolders (first 20):", JSON.stringify(deptSamples));
    const projectsWithPhases = Object.values(phaseMap).filter((p) => p.length > 0).length;
    console.log("[getGanttData] projects with folder-level phases so far:", projectsWithPhases);

    // For department subfolders that have no project-level dates, compute the date range
    // from the tasks inside them (min start → max due). Subtasks store their containing
    // folder in superParentIds (parentIds[0] is the parent task ID for subtasks).
    type Bucket = { starts: number[]; ends: number[]; allCompleted: boolean };
    const buckets = new Map<string, Map<DepartmentPhase["department"], Bucket>>();

    for (const task of allTasks) {
      if (!task.dates?.start || !task.dates?.due) continue;
      const allIds = [...(task.parentIds ?? []), ...(task.superParentIds ?? [])];
      for (const id of allIds) {
        const mapping = folderToDept.get(id);
        if (!mapping) continue;
        const { projectId, department } = mapping;
        // Skip if folder-level dates already supplied this department
        if (phaseMap[projectId]?.some((p) => p.department === department)) break;
        if (!buckets.has(projectId)) buckets.set(projectId, new Map());
        const deptMap = buckets.get(projectId)!;
        if (!deptMap.has(department)) deptMap.set(department, { starts: [], ends: [], allCompleted: true });
        const b = deptMap.get(department)!;
        b.starts.push(new Date(task.dates.start).getTime());
        b.ends.push(new Date(task.dates.due).getTime());
        if (task.status !== "Completed") b.allCompleted = false;
        break;
      }
    }

    const tasksWithDates = allTasks.filter((t) => t.dates?.start && t.dates?.due).length;
    console.log("[getGanttData] total tasks:", allTasks.length, "| with start+due dates:", tasksWithDates, "| bucket projects:", buckets.size);
    if (allTasks.length > 0) {
      const t0 = allTasks[0];
      console.log("[getGanttData] sample task:", t0.title, "| dates:", JSON.stringify(t0.dates), "| parentIds:", t0.parentIds, "| superParentIds:", t0.superParentIds);
    }

    // Merge task-computed ranges into phaseMap for departments not yet covered
    for (const [projId, deptMap] of buckets) {
      for (const [department, b] of deptMap) {
        if (phaseMap[projId]?.some((p) => p.department === department)) continue;
        phaseMap[projId]?.push({
          department,
          start: new Date(Math.min(...b.starts)).toISOString().slice(0, 10),
          end:   new Date(Math.max(...b.ends)).toISOString().slice(0, 10),
          status: b.allCompleted ? "completed" : "active",
        });
      }
    }

    // ── Project→project dependency edges (from task-level Wrike dependencies) ─
    const taskToProject = new Map<string, string>();
    for (const [pid, tlist] of projectTaskMap) {
      for (const t of tlist) taskToProject.set(t.id, pid);
    }
    const dependencies: DependencyEdge[] = [];
    const depIds = new Set<string>();
    for (const task of allTasks) for (const id of task.dependencyIds ?? []) depIds.add(id);
    if (depIds.size > 0) {
      try {
        const deps = await this.getDependencies([...depIds].slice(0, 600));
        const depSeen = new Set<string>();
        for (const d of deps) {
          const fromP = taskToProject.get(d.predecessorId);
          const toP = taskToProject.get(d.successorId);
          if (!fromP || !toP || fromP === toP) continue;
          const key = `${fromP}->${toP}`;
          if (depSeen.has(key)) continue;
          depSeen.add(key);
          dependencies.push({ from: fromP, to: toP });
        }
      } catch (e) {
        console.error("[getGanttData] dependency resolution failed:", e instanceof Error ? e.message : e);
      }
    }

    for (const f of directProjects) {
      const num = extractProjectNumber(f.title);
      const tasks = projectTaskMap.get(f.id) ?? [];
      const dated = tasks.filter((t) => t.dates?.start && t.dates?.due);

      // Prefer project-level dates; fall back to task-derived
      const startDate = f.project?.startDate
        ?? (dated.length ? dated.map((t) => t.dates.start!).sort()[0] : "");
      const endDate = f.project?.endDate
        ?? (dated.length ? dated.map((t) => t.dates.due!).sort().reverse()[0] : "");

      // Use Wrike project status directly when available
      const wrikeStatus = f.project?.status;
      const status = wrikeStatus && wrikeStatus !== "Custom"
        ? wrikeStatus
        : (() => {
            const allDone =
              dated.length > 0 &&
              dated.every((t) => t.status === "Completed" || t.status === "Cancelled");
            const hasOverdue = dated.some(
              (t) =>
                t.dates.due! < today &&
                t.status !== "Completed" &&
                t.status !== "Cancelled"
            );
            return allDone ? "Completed" : hasOverdue ? "Red" : "Green";
          })();

      const riskField = f.customFields?.find((cf) => cf.id === RISK_CUSTOM_FIELD_ID);
      const risk = riskField?.value ?? "";

      projects.push({
        id: f.id, title: f.title, number: num,
        name: cleanProjectName(f.title, num),
        permalink: f.permalink ?? "", startDate, endDate, status, risk,
      });
    }

    return { projects, phaseMap, dependencies };
  }

  /** All tasks in the VIVA schedule folder (paginated, with custom fields) */
  async getScheduleAllTasks(opts?: {
    scheduledStart?: string;
    scheduledEnd?: string;
    maxTasks?: number;
  }): Promise<{ tasks: WrikeTask[]; truncated: boolean }> {
    const all: WrikeTask[] = [];
    let nextPageToken: string | undefined;
    const limit = opts?.maxTasks ?? 2000;

    do {
      const params: Record<string, string> = {
        descendants: "true",
        fields: '["customFields","responsibles"]',
        pageSize: "1000",
      };
      if (opts?.scheduledStart) params["scheduledDate[start]"] = opts.scheduledStart;
      if (opts?.scheduledEnd)   params["scheduledDate[end]"]   = opts.scheduledEnd;
      if (nextPageToken) params.nextPageToken = nextPageToken;

      const res = await this.get<{ data: WrikeTask[]; nextPageToken?: string }>(
        `/folders/${VIVA_SCHEDULE_FOLDER}/tasks`,
        params
      );

      all.push(...res.data);
      nextPageToken = res.nextPageToken;
    } while (nextPageToken && all.length < limit);

    return { tasks: all.slice(0, limit), truncated: all.length >= limit };
  }

  /** Resolve Wrike dependency objects (predecessor/successor task IDs) in batches. */
  async getDependencies(ids: string[]): Promise<Array<{ id: string; predecessorId: string; successorId: string; relationType?: string }>> {
    const out: Array<{ id: string; predecessorId: string; successorId: string; relationType?: string }> = [];
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const res = await this.get<{ data: Array<{ id: string; predecessorId: string; successorId: string; relationType?: string }> }>(
        `/dependencies/${batch.join(",")}`
      );
      out.push(...res.data);
    }
    return out;
  }

  /** Custom field definitions for the account */
  async getCustomFields(): Promise<Array<{ id: string; title: string; type: string }>> {
    const res = await this.get<{ data: Array<{ id: string; title: string; type: string }> }>("/customfields");
    return res.data;
  }

  /** Tasks assigned to a specific contact */
  async getContactTasks(contactId: string): Promise<WrikeTask[]> {
    const res = await this.get<{ data: WrikeTask[] }>("/tasks", {
      assignees: `[${contactId}]`,
      status: "Active",
      fields: '["briefDescription","effortAllocation"]',
    });
    return res.data;
  }
}

// ─── Schedule / Consolidated Dashboard ────────────────────────────────────────

export const VIVA_SCHEDULE_FOLDER = "IEAA4TD3I4CJ65SL";
export const RISK_CUSTOM_FIELD_ID  = "IEAA4TD3JUAG7ZYF";

export interface ScheduleProject {
  id: string;
  title: string;
  number: string;   // e.g. "24-011"
  name: string;     // title without the number prefix and "- NOT EXP" suffix
  permalink: string;
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;
  status: string;     // "Green" | "Yellow" | "Red" | "Completed" | "OnHold" | "Cancelled" | "Custom"
  completedDate?: string;
  risk?: string;      // "1. On Track" | "2. Potential Risk" | "3. At Risk" | "4. ELT Risk"
  progress?: number;  // 0..1, completed tasks / total tasks
}

export interface DependencyEdge {
  from: string;       // predecessor project id
  to: string;         // successor project id
}

export interface DepartmentPhase {
  department: "Design & Engineering" | "Fabrication" | "Install";
  start: string;   // "YYYY-MM-DD"
  end: string;
  status: "completed" | "active";
}

export interface GanttData {
  projects: ScheduleProject[];
  phaseMap: Record<string, DepartmentPhase[]>;
  dependencies?: DependencyEdge[];
}

// Keyword→department mapping (task titles are checked case-insensitively)
// Matches actual VIVA Railings task naming conventions
const DEPT_KEYWORDS: Array<{ department: DepartmentPhase["department"]; keywords: string[] }> = [
  { department: "Design & Engineering", keywords: ["DESIGN", "DRAWING", "ENGINEER", "STRUCTURAL", "STRUC", "APPROVAL", "SUBMITTAL", "PERMIT", "SHOP DRAW", "CALCS"] },
  { department: "Fabrication",          keywords: ["FABRICAT", "FABRICATION", "SAMPLING", "SAMPLE", "MOCKUP", "PRODUCTION", "SHOP"] },
  { department: "Install",              keywords: ["INSTALL", "INSTALLATION", "CONSTRUCTION", "FIELD", "SITE", "ERECT"] },
];

// Folder-name substrings for matching tasks to departments (checked case-insensitively)
// Matches actual VIVA subfolder names: "DESIGN & ENGINEERING", "SAMPLING", "PHASE X - CONSTRUCTION"
const DEPT_FOLDER_MATCH: Record<DepartmentPhase["department"], string[]> = {
  "Design & Engineering": ["DESIGN", "ENGINEER", "DRAWING", "SHOP DRAW", "SUBMITTAL", "PERMIT", "APPROVAL", "STRUC", "CALCS"],
  Fabrication:            ["FABRICAT", "FAB", "MANUFACTUR", "PRODUCTION", "SAMPLING", "SAMPLE", "MOCKUP"],
  Install:                ["INSTALL", "SITE", "FIELD", "ERECT", "CONSTRUCTION", "PHASE"],
};

function extractProjectNumber(title: string): string {
  const m = title.match(/^(\d{2}-\d{3})/);
  return m ? m[1] : "";
}

function cleanProjectName(title: string, number: string): string {
  let name = number ? title.slice(number.length).trim() : title;
  // Remove leading " - " or "- "
  name = name.replace(/^[-\s]+/, "");
  // Remove " - NOT EXP" suffix variants
  name = name.replace(/\s*-\s*NOT\s+EXP\b.*$/i, "");
  return name.trim();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WrikeContact {
  id: string;
  firstName: string;
  lastName: string;
  type: string;
  role: string;
  timezone: string;
  locale: string;
  deleted: boolean;
  avatarUrl?: string;
  profiles: Array<{
    accountId: string;
    email: string;
    role: string;
    external: boolean;
    admin: boolean;
    owner: boolean;
  }>;
}

export interface WrikeTask {
  id: string;
  accountId: string;
  title: string;
  description?: string;
  briefDescription?: string;
  parentIds: string[];
  superParentIds: string[];
  status: "Active" | "Completed" | "Deferred" | "Cancelled";
  importance: "High" | "Normal" | "Low";
  createdDate: string;
  updatedDate: string;
  dates: {
    type: string;
    duration?: number;
    start?: string;
    due?: string;
    workOnWeekends?: boolean;
  };
  scope: string;
  authorIds: string[];
  responsibleIds: string[];
  permalink: string;
  priority: string;
  subTaskIds?: string[];
  dependencyIds?: string[];
  customStatusId?: string;
  customFields?: Array<{ id: string; value: string }>;
  effortAllocation?: {
    mode: string;
    totalEffort: number;
    allocatedEffort: number;
  };
}

export interface WrikeFolder {
  id: string;
  accountId: string;
  title: string;
  createdDate: string;
  updatedDate: string;
  description?: string;
  briefDescription?: string;
  color?: string;
  sharedIds: string[];
  parentIds: string[];
  childIds: string[];
  superParentIds: string[];
  scope: string;
  hasAttachments: boolean;
  permalink: string;
  workflowId?: string;
  metadata?: Array<{ key: string; value: string }>;
  customFields?: Array<{ id: string; value: string }>;
  project?: {
    authorId: string;
    ownerIds: string[];
    status: "Green" | "Yellow" | "Red" | "Completed" | "OnHold" | "Cancelled" | "Custom";
    startDate?: string;
    endDate?: string;
    createdDate: string;
    completedDate?: string;
  };
  space?: boolean;
  stats?: {
    workTrackingEnabled: boolean;
    timeSaved: number;
  };
}

export interface WrikeSpace {
  id: string;
  title: string;
  accessType: string;
  avatarUrl?: string;
  description?: string;
  members?: Array<{ id: string; role: string }>;
}

export interface WrikeWorkflow {
  id: string;
  name: string;
  hidden: boolean;
  standard: boolean;
  customStatuses: Array<{
    id: string;
    name: string;
    standardName: boolean;
    color: string;
    standard: boolean;
    group: "Active" | "Completed" | "Deferred" | "Cancelled";
    hidden: boolean;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function taskUrgency(task: WrikeTask): "overdue" | "today" | "upcoming" | "none" {
  if (!task.dates?.due) return "none";
  const due = new Date(task.dates.due);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay < today) return "overdue";
  if (dueDay.getTime() === today.getTime()) return "today";
  return "upcoming";
}

export function projectHealthColor(status?: string): string {
  switch (status) {
    case "Green": return "var(--green)";
    case "Yellow": return "var(--accent)";
    case "Red": return "var(--red)";
    case "Completed": return "var(--blue)";
    default: return "var(--text-3)";
  }
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDueDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  if (d < today) {
    const days = Math.floor((today.getTime() - d.getTime()) / 86400000);
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
