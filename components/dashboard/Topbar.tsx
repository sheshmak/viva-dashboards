"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface TopbarProps {
  title: string;
  syncedAt?: string; // ISO string of when data was last fetched from Wrike
}

function useRelativeTime(iso?: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!iso) return;
    function update() {
      const diff = Math.floor((Date.now() - new Date(iso!).getTime()) / 1000);
      if (diff < 60)        setLabel("just now");
      else if (diff < 3600) setLabel(`${Math.floor(diff / 60)}m ago`);
      else if (diff < 86400)setLabel(`${Math.floor(diff / 3600)}h ago`);
      else                  setLabel(`${Math.floor(diff / 86400)}d ago`);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return label;
}

export function Topbar({ title, syncedAt }: TopbarProps) {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const relTime = useRelativeTime(syncedAt);

  const now = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  async function handleSync() {
    setSyncing(true);
    setSyncError(false);
    try {
      const res = await fetch("/api/wrike/refresh", { method: "POST" });
      if (!res.ok) throw new Error();
      // Invalidate client cache so pages re-fetch immediately from now-warm server cache
      await queryClient.invalidateQueries();
    } catch {
      setSyncError(true);
      setTimeout(() => setSyncError(false), 3000);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="h-[60px] border-b border-[var(--border)] flex items-center px-8 gap-4 sticky top-0 bg-ground z-40 flex-shrink-0">
      <span className="font-display text-[16px] font-semibold flex-1">{title}</span>

      {syncedAt && (
        <span className="text-[11px] text-[color:var(--text-3)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#238636] flex-shrink-0" />
          Synced {relTime}
        </span>
      )}

      <span className="font-mono text-[12px] text-[color:var(--text-2)]">{now}</span>

      <button
        onClick={handleSync}
        disabled={syncing}
        title="Sync latest data from Wrike"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-2)] bg-transparent text-[color:var(--text-2)] text-[11px] font-medium hover:border-[color:var(--text-2)] hover:text-[color:var(--text)] transition-all disabled:opacity-50"
        aria-label="Sync Wrike data"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={syncError ? "#EF4444" : "currentColor"}
          strokeWidth="2.2"
          strokeLinecap="round"
          className={syncing ? "animate-spin" : ""}
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
        </svg>
        {syncError ? "Failed" : syncing ? "Syncing…" : "Sync"}
      </button>
    </div>
  );
}
