"use client";

import { Topbar } from "@/components/dashboard/Topbar";
import { useContacts, useMyTasks } from "@/hooks/useWrike";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { taskUrgency } from "@/lib/wrike";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface MemberStats {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  active: number;
  overdue: number;
  completed: number;
  total: number;
}

function MemberCard({ member, maxActive }: { member: MemberStats; maxActive: number }) {
  const overduePct = member.active > 0 ? (member.overdue / member.active) * 100 : 0;
  const loadPct = maxActive > 0 ? (member.active / maxActive) * 100 : 0;

  const loadColor =
    loadPct > 80 ? "var(--red)" : loadPct > 55 ? "var(--accent)" : "var(--green)";

  return (
    <div className="bg-ground-2 border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-2)] transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Avatar name={member.name} imageUrl={member.avatarUrl} size={40} />
        <div className="min-w-0">
          <p className="font-display text-[14px] font-semibold truncate">{member.name}</p>
          <p className="text-[11px] text-[color:var(--text-3)] truncate">{member.email}</p>
        </div>
        <span className="ml-auto chip-muted">{member.role}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Active", value: member.active, color: "var(--blue)" },
          { label: "Overdue", value: member.overdue, color: "var(--red)" },
          { label: "Done", value: member.completed, color: "var(--green)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-ground-3 rounded-xl px-3 py-2.5 text-center">
            <p className="font-display font-bold text-[22px] leading-none mb-0.5" style={{ color }}>
              {value}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-[color:var(--text-3)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Load bar */}
      <div>
        <div className="flex justify-between text-[10px] text-[color:var(--text-3)] mb-1.5">
          <span>Workload</span>
          {member.active > 0 && overduePct > 0 && (
            <span className="text-[var(--red)]">{Math.round(overduePct)}% overdue</span>
          )}
        </div>
        <div className="h-1.5 bg-ground-3 rounded overflow-hidden">
          <div
            className="h-full rounded transition-all duration-700"
            style={{ width: `${loadPct}%`, background: loadColor }}
          />
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: tasks, isLoading: tasksLoading } = useMyTasks();
  const [search, setSearch] = useState("");

  const isLoading = contactsLoading || tasksLoading;

  const memberStats = useMemo<MemberStats[]>(() => {
    if (!contacts) return [];

    const members = contacts.filter((c) => !c.deleted && c.type === "Person");

    const tasksByContact = new Map<string, { active: number; overdue: number; completed: number }>();
    tasks?.forEach((task) => {
      task.responsibleIds?.forEach((id) => {
        const existing = tasksByContact.get(id) ?? { active: 0, overdue: 0, completed: 0 };
        if (task.status === "Active") {
          existing.active += 1;
          if (taskUrgency(task) === "overdue") existing.overdue += 1;
        } else if (task.status === "Completed") {
          existing.completed += 1;
        }
        tasksByContact.set(id, existing);
      });
    });

    return members
      .map((c) => {
        const stats = tasksByContact.get(c.id) ?? { active: 0, overdue: 0, completed: 0 };
        const profile = c.profiles?.[0];
        return {
          id: c.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          email: profile?.email ?? "",
          role: profile?.role ?? c.role ?? "Member",
          avatarUrl: c.avatarUrl,
          ...stats,
          total: stats.active + stats.completed,
        };
      })
      .filter((m) =>
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.active - a.active);
  }, [contacts, tasks, search]);

  const maxActive = Math.max(...memberStats.map((m) => m.active), 1);

  return (
    <div>
      <Topbar title="Team" />

      <div className="p-8">
        {/* Search */}
        <div className="mb-6 max-w-sm">
          <input
            type="search"
            placeholder="Search team members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 bg-ground-2 border border-[var(--border)] rounded-xl text-[13px] text-[color:var(--text)] placeholder:text-[color:var(--text-3)] outline-none focus:border-[var(--border-2)] transition-colors"
          />
        </div>

        {isLoading && (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-ground-2 border border-[var(--border)] rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-12 rounded-xl" />)}
                </div>
                <Skeleton className="h-1.5 rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && memberStats.length === 0 && (
          <div className="text-center py-16 text-[color:var(--text-3)] text-[13px]">
            {search ? `No team members match "${search}".` : "No team members found."}
          </div>
        )}

        {!isLoading && memberStats.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4 animate-fade-in">
              {memberStats.map((member) => (
                <MemberCard key={member.id} member={member} maxActive={maxActive} />
              ))}
            </div>
            <p className="mt-4 text-right font-mono text-[11px] text-[color:var(--text-3)]">
              {memberStats.length} member{memberStats.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
