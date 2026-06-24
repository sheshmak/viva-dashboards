"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User { id: string; name: string; email: string; role: string; active: boolean; createdAt: string; }

export default function UsersPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VIEWER" });
  const [error, setError] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/admin/users").then(r => r.json()),
  });

  const createUser = useMutation({
    mutationFn: async (body: typeof form) => {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setShowNew(false); setForm({ name: "", email: "", password: "", role: "VIEWER" }); setError(""); },
    onError: (e: Error) => setError(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.length} member{users.length !== 1 ? "s" : ""} in this workspace</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ Add user</button>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New user</h2>
            {error && <div className="form-error">{error}</div>}
            <div className="form-fields">
              <div className="field"><label>Full name</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" /></div>
              <div className="field"><label>Password</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars" /></div>
              <div className="field">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => createUser.mutate(form)} disabled={createUser.isPending}>
                {createUser.isPending ? "Creating…" : "Create user"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="user-table">
        <div className="table-header">
          <span>Name</span><span>Email</span><span>Role</span><span>Status</span><span>Joined</span><span />
        </div>
        {isLoading ? (
          <div className="loading">Loading users…</div>
        ) : (
          users.map(u => (
            <div key={u.id} className="table-row">
              <span className="user-name">{u.name}</span>
              <span className="user-email">{u.email}</span>
              <span className={`role-badge ${u.role === "ADMIN" ? "role-badge--admin" : ""}`}>{u.role}</span>
              <span>
                <span className={`status-pill ${u.active ? "status-pill--active" : "status-pill--inactive"}`}>
                  {u.active ? "Active" : "Inactive"}
                </span>
              </span>
              <span className="user-date">{new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              <span>
                <button className="btn-ghost-sm" onClick={() => toggleActive.mutate({ id: u.id, active: !u.active })}>
                  {u.active ? "Deactivate" : "Activate"}
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      <style>{`
        .page { padding: 32px 36px; max-width: 1100px; font-family: Inter, system-ui, sans-serif; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
        .page-title { font-size: 24px; font-weight: 700; color: #e2e8f0; margin: 0 0 4px; }
        .page-subtitle { font-size: 13px; color: #64748b; margin: 0; }
        .btn-primary { background: #4f6bed; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .btn-primary:hover:not(:disabled) { background: #3d5ad4; }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .btn-ghost { background: none; border: 1px solid #2a3044; color: #94a3b8; border-radius: 8px; padding: 9px 16px; font-size: 14px; cursor: pointer; }
        .btn-ghost:hover { border-color: #4a5568; color: #c8d3e8; }
        .btn-ghost-sm { background: none; border: 1px solid #2a3044; color: #6b7a99; border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; }
        .btn-ghost-sm:hover { border-color: #4a5568; color: #c8d3e8; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .modal { background: #1a1f2e; border: 1px solid #2a3044; border-radius: 14px; padding: 28px 32px; width: 420px; }
        .modal h2 { font-size: 18px; font-weight: 700; color: #e2e8f0; margin: 0 0 20px; }
        .form-error { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #ff6b6b; margin-bottom: 16px; }
        .form-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        label { font-size: 12px; color: #94a3b8; font-weight: 500; }
        input, select { background: #0f1117; border: 1px solid #2a3044; border-radius: 8px; padding: 9px 12px; font-size: 14px; color: #e2e8f0; outline: none; }
        input:focus, select:focus { border-color: #4f6bed; }
        select { cursor: pointer; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
        .user-table { background: #1a1f2e; border: 1px solid #2a3044; border-radius: 12px; overflow: hidden; }
        .table-header { display: grid; grid-template-columns: 1.4fr 1.8fr 0.8fr 0.8fr 1fr 0.8fr; gap: 0; padding: 12px 20px; background: #141824; border-bottom: 1px solid #2a3044; font-size: 11px; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.07em; }
        .table-row { display: grid; grid-template-columns: 1.4fr 1.8fr 0.8fr 0.8fr 1fr 0.8fr; align-items: center; padding: 14px 20px; border-bottom: 1px solid #1e2538; font-size: 13.5px; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #1e2538; }
        .user-name { font-weight: 600; color: #e2e8f0; }
        .user-email { color: #64748b; }
        .user-date { color: #4a5568; font-size: 12px; }
        .role-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7a99; }
        .role-badge--admin { color: #FFB020; }
        .status-pill { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
        .status-pill--active { background: rgba(61,214,140,.12); color: #3DD68C; }
        .status-pill--inactive { background: rgba(90,99,118,.15); color: #8892a4; }
        .loading { padding: 40px; text-align: center; color: #4a5568; font-size: 14px; }
      `}</style>
    </div>
  );
}
