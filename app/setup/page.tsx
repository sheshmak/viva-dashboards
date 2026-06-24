"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Setup failed."); setLoading(false); return; }
    router.push("/login?setup=done");
  }

  return (
    <div className="setup-root">
      <div className="setup-card">
        <div className="setup-logo">
          <span>⚡</span>
          <span><strong>Viva</strong>Dashboards</span>
        </div>
        <h1>Create admin account</h1>
        <p>This is the first-run setup. You&apos;ll be the admin of this workspace.</p>

        {error && <div className="setup-error">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="field">
            <label>Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required autoFocus />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@company.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required />
          </div>
          <div className="field">
            <label>Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create admin account"}
          </button>
        </form>
        <p className="setup-footer">Already have an account? <a href="/login">Sign in</a></p>
      </div>

      <style>{`
        .setup-root { min-height:100vh; background:#0f1117; display:flex; align-items:center; justify-content:center; font-family:Inter,system-ui,sans-serif; }
        .setup-card { background:#1a1f2e; border:1px solid #2a3044; border-radius:16px; padding:48px 40px; width:100%; max-width:440px; color:#e2e8f0; }
        .setup-logo { display:flex; align-items:center; gap:10px; font-size:20px; margin-bottom:28px; }
        .setup-logo strong { color:#FFB020; }
        h1 { font-size:22px; font-weight:700; margin:0 0 8px; }
        p { font-size:14px; color:#64748b; margin:0 0 24px; }
        .setup-error { background:rgba(255,107,107,.12); border:1px solid rgba(255,107,107,.3); border-radius:8px; padding:12px 16px; font-size:14px; color:#ff6b6b; margin-bottom:18px; }
        .setup-form { display:flex; flex-direction:column; gap:14px; }
        .field { display:flex; flex-direction:column; gap:5px; }
        label { font-size:13px; color:#94a3b8; font-weight:500; }
        input { background:#0f1117; border:1px solid #2a3044; border-radius:8px; padding:10px 14px; font-size:14px; color:#e2e8f0; outline:none; }
        input:focus { border-color:#4f6bed; }
        button { margin-top:8px; background:#4f6bed; color:#fff; border:none; border-radius:8px; padding:12px; font-size:15px; font-weight:600; cursor:pointer; }
        button:hover:not(:disabled) { background:#3d5ad4; }
        button:disabled { opacity:.6; cursor:not-allowed; }
        .setup-footer { margin-top:24px; text-align:center; font-size:13px; color:#64748b; }
        a { color:#7CB9FF; text-decoration:none; }
      `}</style>
    </div>
  );
}
