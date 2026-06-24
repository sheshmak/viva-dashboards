"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type TaskStatus = "Active" | "Completed" | "Deferred" | "Cancelled";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  importance: string;
  dates: { due?: string };
  responsibleIds: string[];
  permalink: string;
}

interface Project {
  id: string;
  title: string;
  project?: {
    status: string;
    startDate?: string;
    endDate?: string;
  };
  permalink: string;
}

const STATUS_COLOR: Record<string, string> = {
  Green: "#3DD68C", Yellow: "#FFB020", Red: "#FF6B6B",
  Completed: "#7CB9FF", OnHold: "#8892a4", Cancelled: "#5a6376",
};
const STATUS_LABEL: Record<string, string> = {
  Green: "On Track", Yellow: "At Risk", Red: "Off Track",
  Completed: "Completed", OnHold: "On Hold", Cancelled: "Cancelled",
};
const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  Active: "#7CB9FF", Completed: "#3DD68C", Deferred: "#FFB020", Cancelled: "#5a6376",
};

export default function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project } = useQuery<Project>({
    queryKey: ["wrike-project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/wrike/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project");
      return res.json();
    },
  });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["wrike-project-tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/wrike/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed to load tasks");
      return res.json();
    },
  });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const active = tasks.filter((t) => t.status === "Active").length;
  const overdue = tasks.filter((t) => {
    if (t.status !== "Active" || !t.dates?.due) return false;
    return new Date(t.dates.due) < new Date();
  }).length;
  const deferred = tasks.filter((t) => t.status === "Deferred").length;

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const statusColor = STATUS_COLOR[project?.project?.status ?? ""] ?? "#8892a4";
  const statusLabel = STATUS_LABEL[project?.project?.status ?? ""] ?? "Unknown";

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link href="/wrike/projects" className="bc-link">Projects</Link>
        <span className="bc-sep">›</span>
        <span className="bc-current">{project?.title ?? "Loading…"}</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{project?.title ?? "—"}</h1>
          <div className="status-badge" style={{ color: statusColor, background: `${statusColor}1a` }}>
            <span className="status-dot" style={{ background: statusColor }} />
            {statusLabel}
          </div>
        </div>
        {project?.project?.endDate && (
          <div className="due-date">
            <span>Due</span>
            <strong>{new Date(project.project.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>
          </div>
        )}
      </div>

      <div className="kpi-row">
        {[
          { label: "Total Tasks", value: total, color: "#e2e8f0" },
          { label: "Completed", value: completed, color: "#3DD68C" },
          { label: "Active", value: active, color: "#7CB9FF" },
          { label: "Overdue", value: overdue, color: "#FF6B6B" },
          { label: "Deferred", value: deferred, color: "#FFB020" },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <span>Completion</span>
          <strong style={{ color: "#3DD68C" }}>{pct}%</strong>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="tasks-section">
        <h2 className="section-title">Tasks</h2>
        {isLoading ? (
          <div className="loading">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="empty">No tasks in this project.</div>
        ) : (
          <div className="task-list">
            {tasks.map((t) => {
              const isOverdue = t.status === "Active" && t.dates?.due && new Date(t.dates.due) < new Date();
              return (
                <div key={t.id} className="task-row">
                  <span className="task-dot" style={{ background: TASK_STATUS_COLOR[t.status] }} />
                  <span className="task-title">{t.title}</span>
                  <span className="task-status" style={{ color: TASK_STATUS_COLOR[t.status] }}>{t.status}</span>
                  {t.dates?.due && (
                    <span className="task-due" style={{ color: isOverdue ? "#FF6B6B" : "#64748b" }}>
                      {new Date(t.dates.due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .page { padding: 32px 36px; max-width: 1200px; font-family: Inter, system-ui, sans-serif; }
        .breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 13px; }
        .bc-link { color: #7CB9FF; text-decoration: none; }
        .bc-link:hover { text-decoration: underline; }
        .bc-sep, .bc-current { color: #4a5568; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
        .page-title { font-size: 26px; font-weight: 700; color: #e2e8f0; margin: 0 0 10px; }
        .status-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; }
        .due-date { text-align: right; font-size: 13px; color: #64748b; display: flex; flex-direction: column; gap: 2px; }
        .due-date strong { color: #e2e8f0; font-size: 15px; }
        .kpi-row { display: flex; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
        .kpi-card { background: #1a1f2e; border: 1px solid #2a3044; border-radius: 10px; padding: 16px 20px; min-width: 120px; flex: 1; }
        .kpi-value { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
        .kpi-label { font-size: 12px; color: #64748b; font-weight: 500; }
        .progress-section { background: #1a1f2e; border: 1px solid #2a3044; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; }
        .progress-header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #94a3b8; margin-bottom: 10px; }
        .progress-bar { height: 6px; background: #1e2538; border-radius: 999px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #3DD68C, #7CB9FF); border-radius: 999px; transition: width 0.6s ease; }
        .tasks-section { background: #1a1f2e; border: 1px solid #2a3044; border-radius: 12px; padding: 20px 24px; }
        .section-title { font-size: 14px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 16px; }
        .task-list { display: flex; flex-direction: column; gap: 1px; }
        .task-row { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 6px; transition: background 0.1s; }
        .task-row:hover { background: #1e2538; }
        .task-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .task-title { flex: 1; font-size: 13.5px; color: #c8d3e8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .task-status { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0; }
        .task-due { font-size: 12px; flex-shrink: 0; min-width: 60px; text-align: right; }
        .loading, .empty { text-align: center; color: #4a5568; font-size: 14px; padding: 40px; }
      `}</style>
    </div>
  );
}
