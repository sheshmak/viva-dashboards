"use client";

import { Topbar } from "@/components/dashboard/Topbar";
import { useSpaces, useContacts } from "@/hooks/useWrike";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMemo } from "react";
import type { WrikeSpace } from "@/lib/wrike";

function SpaceCard({
  space,
  memberCount,
}: {
  space: WrikeSpace;
  memberCount: number;
}) {
  return (
    <div className="bg-ground-2 border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-2)] transition-colors cursor-default">
      {/* Icon + title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-ground-3 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-[14px] font-semibold truncate">{space.title}</h3>
          <p className="text-[11px] text-[color:var(--text-3)] capitalize">{space.accessType.toLowerCase()} space</p>
        </div>
      </div>

      {space.description && (
        <p className="text-[12px] text-[color:var(--text-2)] line-clamp-2 mb-4">{space.description}</p>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[12px] text-[color:var(--text-2)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <span>{memberCount > 0 ? `${memberCount} member${memberCount !== 1 ? "s" : ""}` : "—"}</span>
        </div>
        <span className="chip-muted">{space.accessType}</span>
      </div>
    </div>
  );
}

export default function SpacesPage() {
  const { data: spaces, isLoading: spacesLoading, isError } = useSpaces();
  const { data: contacts } = useContacts();

  const memberCountBySpace = useMemo(() => {
    const map = new Map<string, number>();
    spaces?.forEach((s) => {
      map.set(s.id, s.members?.length ?? 0);
    });
    return map;
  }, [spaces]);

  const isLoading = spacesLoading;

  return (
    <div>
      <Topbar title="Spaces" />

      <div className="p-8">
        {/* Summary strip */}
        {!isLoading && spaces && spaces.length > 0 && (
          <div className="flex items-center gap-6 mb-6 px-5 py-3.5 bg-ground-2 border border-[var(--border)] rounded-xl">
            <div className="text-center">
              <p className="font-display font-bold text-[24px] text-[var(--accent)]">{spaces.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-[color:var(--text-3)]">Spaces</p>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="text-center">
              <p className="font-display font-bold text-[24px] text-[var(--blue)]">
                {spaces.filter((s) => s.accessType === "Public").length}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[color:var(--text-3)]">Public</p>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="text-center">
              <p className="font-display font-bold text-[24px] text-[var(--green)]">
                {contacts?.filter((c) => !c.deleted && c.type === "Person").length ?? 0}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[color:var(--text-3)]">Team members</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-ground-2 border border-[var(--border)] rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-8" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16">
            <p className="text-[var(--red)] text-[13px]">Failed to load spaces.</p>
            <p className="text-[color:var(--text-3)] text-[12px] mt-1">Check your Wrike connection and refresh.</p>
          </div>
        )}

        {!isLoading && !isError && spaces?.length === 0 && (
          <div className="text-center py-16 text-[color:var(--text-3)] text-[13px]">
            No spaces visible with your access level.
          </div>
        )}

        {!isLoading && spaces && spaces.length > 0 && (
          <div className="grid grid-cols-3 gap-4 animate-fade-in">
            {spaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                memberCount={memberCountBySpace.get(space.id) ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
