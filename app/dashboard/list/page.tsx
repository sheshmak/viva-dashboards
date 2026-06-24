"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";

interface DashboardItem {
  id: string;
  type: string;
  name: string;
  description: string;
  route: string;
  icon: string;
  order: number;
  isPublic: boolean;
  sharedUserIds: string[];
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function DashIcon({ icon }: { icon: string }) {
  const common = {
    width: 22, height: 22, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (icon) {
    case "timeline":
      return (<svg {...common}><line x1="3" y1="6" x2="21" y2="6" /><rect x="3" y="10" width="9" height="3" rx="1.5" /><rect x="6" y="15" width="15" height="3" rx="1.5" /></svg>);
    case "folder":
      return (<svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>);
    case "check":
      return (<svg {...common}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>);
    case "users":
      return (<svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
    case "layers":
      return (<svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>);
    case "grid":
    default:
      return (<svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
  }
}

// ─── Share modal ────────────────────────────────────────────────────────────────
function ShareModal({
  dashboard, users, onClose, onSaved,
}: {
  dashboard: DashboardItem;
  users: UserRow[];
  onClose: () => void;
  onSaved: (userIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(dashboard.sharedUserIds));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const shareable = users.filter((u) => u.role !== "ADMIN"); // admins already see everything
  const filtered = shareable.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const userIds = [...selected];
      const res = await fetch(`/api/dashboards/${dashboard.id}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onSaved(data.userIds ?? userIds);
    } catch {
      alert("Failed to save share settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 460, maxHeight: "80vh", background: "var(--ground-2)", border: "1px solid var(--border)", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Share dashboard</div>
          <div style={{ fontSize: 15, color: "var(--text)", fontWeight: 600, marginTop: 4 }}>{dashboard.name}</div>
        </div>

        <div style={{ padding: "12px 20px 0" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            style={{ width: "100%", background: "var(--ground)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none" }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              {shareable.length === 0 ? "No non-admin users yet. Add users in Team Onboarding." : "No users match your search."}
            </div>
          ) : (
            filtered.map((u) => {
              const checked = selected.has(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", background: checked ? "rgba(79,107,237,0.14)" : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 2 }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? "var(--primary)" : "var(--border-2)"}`, background: checked ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-2)", marginRight: "auto" }}>{selected.size} selected</span>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DashboardsListPage() {
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<DashboardItem | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboards");
        if (!res.ok) throw new Error("Failed to load dashboards");
        const data = await res.json();
        setDashboards(data.dashboards ?? []);
        setIsAdmin(!!data.isAdmin);
        if (data.isAdmin) {
          const ures = await fetch("/api/admin/users");
          if (ures.ok) setUsers(await ures.json());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const userById = useMemo(() => {
    const m = new Map<string, UserRow>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  function handleSaved(dashId: string, userIds: string[]) {
    setDashboards((prev) => prev.map((d) => (d.id === dashId ? { ...d, sharedUserIds: userIds } : d)));
    setSharing(null);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Topbar title="Wrike Dashboards" />

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>Dashboards</h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6 }}>
            {isAdmin
              ? "Open a dashboard, or share it with specific team members."
              : "Dashboards shared with you."}
          </p>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-2)", fontSize: 13 }}>Loading dashboards…</div>
        ) : error ? (
          <div style={{ color: "#EF4444", fontSize: 13 }}>{error}</div>
        ) : dashboards.length === 0 ? (
          <div style={{ color: "var(--text-3)", fontSize: 13 }}>
            No dashboards are shared with you yet. Ask an admin to grant access.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {dashboards.map((d, i) => (
              <div
                key={d.id}
                style={{ background: "var(--ground-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}
              >
                {i === 0 && (
                  <span style={{ position: "absolute", top: 14, right: 14, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(255,176,32,0.12)", padding: "3px 7px", borderRadius: 6 }}>
                    Primary
                  </span>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 11, background: "rgba(79,107,237,0.14)", color: "var(--link)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <DashIcon icon={d.icon} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>{d.name}</div>
                  </div>
                </div>

                <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5, margin: 0, minHeight: 38 }}>{d.description}</p>

                {isAdmin && (
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {d.isPublic
                      ? "Visible to everyone"
                      : d.sharedUserIds.length === 0
                      ? "Not shared yet"
                      : `Shared with ${d.sharedUserIds.length} ${d.sharedUserIds.length === 1 ? "user" : "users"}`}
                    {!d.isPublic && d.sharedUserIds.length > 0 && (
                      <span style={{ color: "var(--text-3)" }}>
                        {" — "}
                        {d.sharedUserIds.slice(0, 3).map((uid) => userById.get(uid)?.name ?? "—").join(", ")}
                        {d.sharedUserIds.length > 3 ? ` +${d.sharedUserIds.length - 3}` : ""}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
                  <Link
                    href={d.route}
                    style={{ flex: 1, textAlign: "center", padding: "8px 14px", borderRadius: 9, background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                  >
                    Open
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => setSharing(d)}
                      style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid var(--border-2)", background: "transparent", color: "var(--text-soft)", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      Share
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sharing && (
        <ShareModal
          dashboard={sharing}
          users={users}
          onClose={() => setSharing(null)}
          onSaved={(ids) => handleSaved(sharing.id, ids)}
        />
      )}
    </div>
  );
}
