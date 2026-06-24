"use client";
import { useQuery } from "@tanstack/react-query";

interface ConnectionStatus { connected: boolean; expiresAt?: string; host?: string; }

export default function ConnectionsPage() {
  const { data: wrike, isLoading } = useQuery<ConnectionStatus>({
    queryKey: ["wrike-connection-status"],
    queryFn: () => fetch("/api/connections/wrike").then(r => r.json()),
  });

  function connectWrike() {
    window.location.href = "/api/connections/wrike/start";
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Connections</h1>
          <p className="page-subtitle">Manage integrations that power your dashboards</p>
        </div>
      </div>

      <div className="connections-list">
        <div className="connection-card">
          <div className="connection-left">
            <div className="connection-icon">W</div>
            <div className="connection-info">
              <div className="connection-name">Wrike</div>
              <div className="connection-desc">Fetch projects, tasks and workspace data for dashboards</div>
              {wrike?.connected && wrike.expiresAt && (
                <div className="connection-meta">
                  Token expires: {new Date(wrike.expiresAt).toLocaleString()}
                  {wrike.host && <> · Host: {wrike.host}</>}
                </div>
              )}
            </div>
          </div>
          <div className="connection-right">
            {isLoading ? (
              <span className="connection-status">Checking…</span>
            ) : wrike?.connected ? (
              <>
                <span className="connection-status connection-status--ok">Connected</span>
                <button className="btn-ghost" onClick={connectWrike}>Reconnect</button>
              </>
            ) : (
              <>
                <span className="connection-status connection-status--off">Not connected</span>
                <button className="btn-primary" onClick={connectWrike}>Connect Wrike</button>
              </>
            )}
          </div>
        </div>

        <div className="connection-card connection-card--soon">
          <div className="connection-left">
            <div className="connection-icon connection-icon--sf">SF</div>
            <div className="connection-info">
              <div className="connection-name">Salesforce</div>
              <div className="connection-desc">CRM data, pipeline, and deal analytics</div>
            </div>
          </div>
          <div className="connection-right">
            <span className="coming-soon">Coming soon</span>
          </div>
        </div>
      </div>

      <div className="instructions">
        <h3>How to connect Wrike</h3>
        <ol>
          <li>Click <strong>Connect Wrike</strong> above.</li>
          <li>You will be redirected to Wrike to authorize this app.</li>
          <li>After authorizing, you&apos;ll return here and the connection will be active.</li>
          <li>The connection is shared — all dashboard users will see data from your Wrike account.</li>
        </ol>
        <p className="note">
          <strong>Note:</strong> You must first add <code>http://localhost:3000/api/connections/wrike/callback</code> as an allowed redirect URI in your Wrike app settings at{" "}
          <a href="https://www.wrike.com/frontend/apps/index.html#/api" target="_blank" rel="noreferrer">wrike.com → Apps &amp; Integrations → API</a>.
        </p>
      </div>

      <style>{`
        .page { padding: 32px 36px; max-width: 900px; font-family: Inter, system-ui, sans-serif; }
        .page-header { margin-bottom: 28px; }
        .page-title { font-size: 24px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
        .page-subtitle { font-size: 13px; color: var(--text-2); margin: 0; }
        .connections-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 36px; }
        .connection-card { background: var(--ground-2); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .connection-card--soon { opacity: .55; }
        .connection-left { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
        .connection-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .connection-icon--sf { background: #00a1e0; }
        .connection-info { min-width: 0; }
        .connection-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
        .connection-desc { font-size: 13px; color: var(--text-2); }
        .connection-meta { font-size: 11px; color: var(--text-3); margin-top: 4px; }
        .connection-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .connection-status { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); }
        .connection-status--ok { color: #3DD68C; }
        .connection-status--off { color: #ff6b6b; }
        .coming-soon { font-size: 12px; font-weight: 600; color: var(--text-3); background: var(--border); border: 1px solid var(--border); border-radius: 999px; padding: 4px 12px; }
        .btn-primary { background: var(--primary); color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-primary:hover { background: var(--primary-hover); }
        .btn-ghost { background: none; border: 1px solid var(--border); color: var(--text-2); border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer; }
        .btn-ghost:hover { border-color: var(--text-3); color: var(--text-soft); }
        .instructions { background: var(--ground-2); border: 1px solid var(--border); border-radius: 12px; padding: 24px 28px; }
        .instructions h3 { font-size: 15px; font-weight: 600; color: var(--text-soft); margin: 0 0 16px; }
        .instructions ol { margin: 0 0 16px; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
        li { font-size: 13.5px; color: var(--text-2); line-height: 1.5; }
        .note { font-size: 12.5px; color: var(--text-2); background: var(--ground-2); border-radius: 8px; padding: 12px 16px; margin: 0; line-height: 1.6; }
        code { background: var(--ground); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; font-size: 11.5px; color: var(--link); }
        a { color: var(--link); text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
