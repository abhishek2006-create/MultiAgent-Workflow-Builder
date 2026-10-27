"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { DashboardOverview } from "../../types/workflow";

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const inFlight = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      setOverview(await api.dashboard.overview());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load workspace metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
    const refreshVisible = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refreshVisible, 5_000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [load]);

  const recentUsage = overview?.recentUsage;
  const metrics = [
    ["WORKFLOWS", overview?.workflowCount ?? 0, "#2f7bff"],
    ["EXECUTIONS", overview?.executionCount ?? 0, "#8b5cf6"],
    ["SUCCESS RATE", overview?.successRate === null || overview?.successRate === undefined ? "—" : `${overview.successRate}%`, "#10b981"],
    ["TOKENS · LATEST 10 RUNS", recentUsage?.totalTokens ?? 0, "#22d3ee"],
  ] as const;

  return (
    <section className="view on">
      <div className="dash">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2>SYSTEM OVERVIEW</h2>
          <div className="flex gap-2">
            <button className="btn" type="button" disabled={refreshing} onClick={() => void load()}>{refreshing ? "REFRESHING…" : "REFRESH"}</button>
            <Link className="btn" href="/workflows">WORKFLOWS</Link>
            <Link className="btn pri" href="/workflows/demo">NEW WORKFLOW</Link>
          </div>
        </div>

        <p aria-live="polite" className="mb-4 font-mono text-xs text-slate-400">{overview ? `${error ? "STALE DATA" : "AUTO REFRESH · EVERY 5 SECONDS"} · Updated ${new Date(overview.updatedAt).toLocaleTimeString()}` : "Connecting to workspace metrics…"}</p>
        {error && <p role="alert" className="mb-4 rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

        <div className="grid4">
          {metrics.map(([label, value, color]) => (
            <div className="glass mc" key={label}>
              <small>{label}</small>
              <div className="n">{!overview ? (loading ? "…" : "—") : typeof value === "number" ? value.toLocaleString() : value}</div>
              <div className="tr" style={{ color }}>{label === "TOKENS · LATEST 10 RUNS" && value === 0 ? "Usage metadata appears when the provider returns it" : "Current workspace data"}</div>
            </div>
          ))}
        </div>

        <div className="dg">
          <div className="glass cp">
            <div className="ph"><span>EXECUTION STATUS</span><span className="mono">CURRENT WORKSPACE</span></div>
            <div className="space-y-3 py-2">
              {[["QUEUED", "#fbbf24"], ["RUNNING", "#60a5fa"], ["WAITING_APPROVAL", "#c084fc"], ["COMPLETED", "#34d399"], ["FAILED", "#fb7185"], ["CANCELLED", "#94a3b8"]].map(([status, color]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span style={{ color }}>{status.replaceAll("_", " ")}</span>
                  <b className="mono">{!overview ? "—" : overview?.statuses[status] ?? 0}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="glass cp">
            <div className="ph"><span>PROVIDER USAGE</span><span className="mono">LATEST 10 RUNS</span></div>
            <div className="mu"><div><span>Input tokens</span><span className="mono">{!overview ? "—" : (recentUsage?.inputTokens ?? 0).toLocaleString()}</span></div></div>
            <div className="mu"><div><span>Output tokens</span><span className="mono">{!overview ? "—" : (recentUsage?.outputTokens ?? 0).toLocaleString()}</span></div></div>
            <p className="mono usage-foot">Provider-reported counts only. Cost is not estimated.</p>
          </div>
          <div className="glass cp">
            <div className="ph"><span>RECENT ACTIVITY</span><span className="mono">REAL EXECUTIONS</span></div>
            {loading ? <p className="text-sm text-slate-400">Loading activity…</p> : overview?.recentExecutions.length ? (
              <div className="feed mono">
                {overview.recentExecutions.slice(0, 6).map((run) => (
                  <Link key={run.id} href={`/workflows/${encodeURIComponent(run.workflowId)}/history`} className="block hover:text-cyan-200">
                    <b>{run.status}</b>{run.workflowName} · {new Date(run.createdAt).toLocaleString()}
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">No executions yet.</p>}
          </div>
        </div>

        <div className="glass tw overflow-x-auto">
          <div className="ph px-4 pt-4"><span>RECENT EXECUTIONS</span><span className="mono">LATEST 10</span></div>
          <table className="tbl min-w-[680px]">
            <thead><tr>{["EXECUTION ID", "WORKFLOW", "STATUS", "VERSION", "DURATION", "STEPS"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6}>Loading executions…</td></tr> : overview?.recentExecutions.length ? overview.recentExecutions.map((run) => (
                <tr key={run.id}>
                  <td className="mono">{run.id.slice(0, 12)}</td>
                  <td><Link href={`/workflows/${encodeURIComponent(run.workflowId)}/history`} className="hover:text-cyan-200">{run.workflowName}</Link></td>
                  <td><span className={`sb ${run.status === "COMPLETED" ? "s" : run.status === "RUNNING" || run.status === "QUEUED" ? "r" : "f"}`}>{run.status}</span></td>
                  <td>{run.version ?? "—"}</td>
                  <td className="mono">{formatDuration(run.durationMs ?? (["RUNNING", "WAITING_APPROVAL"].includes(run.status) && run.startedAt ? Math.max(0, new Date(overview.updatedAt).getTime() - new Date(run.startedAt).getTime()) : null))}</td>
                  <td className="mono">{run.stepCount}</td>
                </tr>
              )) : <tr><td colSpan={6}>{error ? "Activity is unavailable." : "No runs yet. Start a workflow to see its history here."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "—";
  return durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`;
}
