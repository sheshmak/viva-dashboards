"use client";
import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, callbackUrl: "/dashboard/list" });
    setLoading(false);
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">⚡</span>
          <span className="login-logo-text">
            <strong>Viva</strong>Dashboards
          </span>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to your dashboard workspace</p>

        {error && (
          <div className="login-error">
            Invalid email or password. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label className="field-label">Email</label>
            <input type="email" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input type="password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-footer">
          First time?{" "}
          <a href="/setup" className="login-link">Set up admin account</a>
        </p>
      </div>

      <style>{`
        .login-root { min-height:100vh; background:#0f1117; display:flex; align-items:center; justify-content:center; font-family:Inter,system-ui,sans-serif; }
        .login-card { background:#1a1f2e; border:1px solid #2a3044; border-radius:16px; padding:48px 40px; width:100%; max-width:420px; }
        .login-logo { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
        .login-logo-icon { font-size:28px; line-height:1; }
        .login-logo-text { font-size:20px; color:#e2e8f0; letter-spacing:-0.3px; }
        .login-logo-text strong { color:#FFB020; }
        .login-title { font-size:24px; font-weight:700; color:#e2e8f0; margin:0 0 6px; }
        .login-subtitle { font-size:14px; color:#64748b; margin:0 0 28px; }
        .login-error { background:rgba(255,107,107,.12); border:1px solid rgba(255,107,107,.3); border-radius:8px; padding:12px 16px; font-size:14px; color:#ff6b6b; margin-bottom:20px; }
        .login-form { display:flex; flex-direction:column; gap:16px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .field-label { font-size:13px; color:#94a3b8; font-weight:500; }
        .field-input { background:#0f1117; border:1px solid #2a3044; border-radius:8px; padding:10px 14px; font-size:14px; color:#e2e8f0; outline:none; transition:border-color .15s; }
        .field-input:focus { border-color:#4f6bed; }
        .field-input::placeholder { color:#3a4257; }
        .login-btn { margin-top:8px; background:#4f6bed; color:#fff; border:none; border-radius:8px; padding:12px; font-size:15px; font-weight:600; cursor:pointer; transition:background .15s; }
        .login-btn:hover:not(:disabled) { background:#3d5ad4; }
        .login-btn:disabled { opacity:.6; cursor:not-allowed; }
        .login-footer { margin-top:24px; text-align:center; font-size:13px; color:#64748b; }
        .login-link { color:#7CB9FF; text-decoration:none; }
        .login-link:hover { text-decoration:underline; }
      `}</style>
    </div>
  );
}
