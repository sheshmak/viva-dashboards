"use client";

import { Topbar } from "@/components/dashboard/Topbar";
import { useProjects } from "@/hooks/useWrike";
import { projectHealthColor } from "@/lib/wrike";
import { projectStatusChip } from "@/components/ui/Chip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useMemo, useState } from "react";
import type { WrikeFolder } from "@/lib/wrike";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type StatusFilter = "All" | "Red" | "Yellow" | "Green" | "Completed" | "OnHold";

function ProjectCard({ project }: { project: WrikeFolder }) {
  const status = project.project?.status;
  const color = projectHealthColor(status);

  const startDate = project.project?.startDate
    ? format(new Date(project.project.startDate), "MMM d")
    : null;
  const endDate = project.project?.endDate
    ? format(new Date(project.project.endDate), "MMM d, yyyy")
    : null;

  const isOverdue =
    project.project?.endDate &&
    new Date(project.project.endDate) < new Date() &&
    status !== "Completed" &&
    status !== "Cancelled";

  return (
    <div className="bg-ground-2 border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-2)] transition-colors cursor-default group">
      {/* Status bar + title */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-1 h-full rounded flex-shrink-0 min-h-[48px]"
          style={{ background: color }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[14px] font-semibold leading-snug mb-1 truncate" title={project.title}>
            {project.title}
          </h3>
          {project.briefDescription && (
            <p className="text-[12px] text-[#8B9BC0] line-clamp-2">
              {project.briefDescription}
            </p>
          )}
        </div>
      </div>

      {/* Status chip + dates */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {projectStatusChip(status)}
          {isOverdue && (
            <span className="chip-base bg-[var(--red-dim)] text-[var(--red)]">Overdue</span>
          )}
        </div>
        {(startDate || endDate) && (
          <span className="font-mono text-[10px] text-[#5A6A94]">
            {startDate && endDate ? `${startDate} – ${endDate}` : endDate ?? startDate}
          </span>
        )}
      </div>
    </div>
  );
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Red", label: "At risk" },
  { value: "Yellow", label: "On watch" },
  { value: "Green", label: "On track" },
  { value: "Completed", label: "Completed" },
  { value: "OnHold", label: "On hold" },
];

export default function ProjectsPage() {
  const { data: projects, isLoading, isError } = useProjects();
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo<WrikeFolder[]>(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      if (filter !== "All" && p.project?.status !== filter) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [projects, filter, search]);

  const counts = useMemo(() => {
    if (!projects) return {} as Record<string, number>;
    const c: Record<string, number> = { All: projects.length };
    projects.forEach((p) => {
      const s = p.project?.status ?? "Unknown";
      c[s] = (c[s] ?? 0) + 1;
    });
    return c;
  }, [projects]);

  return (
    <div>
      <Topbar title="Projects" />

      <div className="p-8">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                  filter === value
                    ? "bg-ground-3 text-[#EEF0FF] border border-[var(--border-2)]"
                    : "text-[#8B9BC0] hover:text-[#EEF0FF] border border-transparent"
                )}
              >
                {label}
                {counts[value === "Yellow" ? "Yellow" : value] !== undefined && (
                  <span className="ml-1.5 font-mono text-[10px] opacity-60">
                    {value === "All" ? counts.All : counts[value] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 max-w-xs">
            <input
              type="search"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-ground-2 border border-[var(--border)] rounded-xl text-[13px] text-[#EEF0FF] placeholder:text-[#5A6A94] outline-none focus:border-[var(--border-2)] transition-colors"
            />
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <p className="text-[var(--red)] text-[13px]">Failed to load projects.</p>
            <p className="text-[#5A6A94] text-[12px] mt-1">Check your Wrike connection and refresh.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-16 text-[#5A6A94] text-[13px]">
            {search ? `No projects match "${search}".` : "No projects visible with your access."}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4 animate-fade-in">
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            <p className="mt-4 text-right font-mono text-[11px] text-[#5A6A94]">
              {filtered.length} project{filtered.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
