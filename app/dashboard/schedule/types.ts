export type Department = "Design & Engineering" | "Fabrication" | "Install";
export type GanttZoom = "week" | "month" | "quarter" | "year" | "12months";
export type ScheduleView = "gantt" | "summary" | "table";

export const DEPARTMENTS: Department[] = ["Design & Engineering", "Fabrication", "Install"];

export const DEPT_COLORS: Record<Department, string> = {
  "Design & Engineering": "#1E6FD9",
  Fabrication:            "#D97706",
  Install:                "#0D9488",
};

export const DEPT_BG: Record<Department, string> = {
  "Design & Engineering": "rgba(30,111,217,0.15)",
  Fabrication:            "rgba(217,119,6,0.15)",
  Install:                "rgba(13,148,136,0.15)",
};

export const STATUS_COLORS: Record<string, string> = {
  Green:     "#238636",
  Yellow:    "#D97706",
  Red:       "#EF4444",
  Completed: "#3B82F6",
  OnHold:    "#6B7280",
  Cancelled: "#374151",
  Custom:    "#6B7280",
};

export const STATUS_LABELS: Record<string, string> = {
  Green:     "On Track",
  Yellow:    "At Risk",
  Red:       "Off Track",
  Completed: "Completed",
  OnHold:    "On Hold",
  Cancelled: "Cancelled",
};

export interface SchedulePhase {
  department: Department;
  start: string;
  end: string;
  status: "completed" | "active";
}

export interface ScheduleProject {
  id: string;
  title: string;
  number: string;
  name: string;
  permalink: string;
  startDate: string;
  endDate: string;
  status: string;
  completedDate?: string;
  risk?: string;
  progress?: number;          // 0..1 from backend (completed/total tasks)
  responsibleIds?: string[];
  phases: SchedulePhase[];
  isOverdue: boolean;
}

export interface ScheduleTask {
  id: string;
  title: string;
  projectId: string;
  department?: Department;
  status: string;
  importance: string;
  startDate?: string;
  dueDate?: string;
  isOverdue: boolean;
  isMilestone: boolean;
  pm?: string;
  superintendent?: string;
  designer?: string;
  queueTime?: string;
  riskStatus?: string;
  customFields?: Array<{ id: string; name?: string; value: string }>;
  parentIds?: string[];
}

export interface FilterState {
  departments: Department[];
  priorities: string[];
  statuses: string[];
  pastDueOnly: boolean;
  search: string;
}

export const DEFAULT_FILTERS: FilterState = {
  departments: [],
  priorities: [],
  statuses: [],
  pastDueOnly: false,
  search: "",
};

export type GanttRowType = "project" | "phase";

export interface GanttRow {
  type: GanttRowType;
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: string;
  department?: Department;
  depth: number;
  projectId: string;
  isOverdue: boolean;
  extra?: Record<string, unknown>;
}
