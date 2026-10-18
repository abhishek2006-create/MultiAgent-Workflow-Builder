"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { WorkflowExecution, WorkflowExecutionSummary } from "../../types/workflow";

const ACTIVE = new Set(["QUEUED", "RUNNING", "WAITING_APPROVAL"]);

export default function ExecutionHistory({ workflowId }: { workflowId: string }) {
  const [runs, setRuns] = useState<WorkflowExecutionSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const historyLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const page = await api.workflows.executions(workflowId);
      setRuns((current) => mergeRuns(page.items, current));
      if (!historyLoaded.current) setNextCursor(page.nextCursor);
      historyLoaded.current = true;
      const currentId = selectedId ?? page.items[0]?.id ?? null;
      if (currentId && currentId !== selectedId) setSelectedId(currentId);
      if (currentId) {
        const detail = await api.workflows.execution(workflowId, currentId);
        setDetails(detail);
      } else {
        setDetails(null);
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load execution history.");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [workflowId, selectedId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!runs.some((run) => ACTIVE.has(run.status))) return;
    const timer = window.setInterval(() => void refresh(), 2_000);
    return () => window.clearInterval(timer);
  }, [runs, refresh]);

  const loadMore = async () => {
    if (!nextCursor) return;
    try {
      const page = await api.workflows.executions(workflowId, nextCursor);
      setRuns((current) => mergeRuns(current, page.items));
      setNextCursor(page.nextCursor);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load more execution history.");
    }
  };

  const retry = async () => {
    if (!details) return;
    setBusy(true);
    try {
      const result = await api.executions.retry(details.id);
      setSelectedId(result.executionId);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to retry this run.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!details) return;
    setBusy(true);
    try {
      await api.executions.cancel(details.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to cancel this run.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 text-white">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-300">WORKFLOW RUNS</p>
          <h1 className="mt-2 text-3xl font-semibold">Execution history</h1>
          <p className="mt-2 text-sm text-slate-400">Inspect saved inputs, node results, timing, and errors for each run.</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn" href="/workflows">All workflows</Link>
          <Link className="btn pri" href={`/workflows/${encodeURIComponent(workflowId)}`}>Open workflow</Link>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {loading ? <p className="text-sm text-slate-400">Loading runs…</p> : runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-slate-400">No executions yet. Open the workflow and start a run to see its history here.</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-2">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => setSelectedId(run.id)}
                className={`w-full rounded-lg border p-3 text-left ${selectedId === run.id ? "border-cyan-300/40 bg-cyan-300/10" : "border-white/10 bg-white/[0.025] hover:bg-white/[0.06]"}`}
              >
                <span className="flex items-center justify-between gap-2 text-xs font-semibold"><span>{run.status.replaceAll("_", " ")}</span><span className="font-mono text-[10px] text-slate-500">v{run.workflowVersion?.version ?? "?"}</span></span>
                <span className="mt-2 block font-mono text-[10px] text-slate-400">{new Date(run.createdAt).toLocaleString()}</span>
                <span className="mt-1 block font-mono text-[10px] text-slate-600">{run.id.slice(0, 18)}</span>
              </button>
            ))}
            {nextCursor && <button type="button" className="btn w-full" onClick={() => void loadMore()}>Load older runs</button>}
          </aside>

          <section className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-5">
            {!details ? <p className="text-sm text-slate-400">Select a run to inspect it.</p> : <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{details.id}</p>
                  <h2 className="mt-1 text-xl font-semibold">{details.status.replaceAll("_", " ")}</h2>
                  <p className="mt-1 text-xs text-slate-400">Started {details.startedAt ? new Date(details.startedAt).toLocaleString() : "—"} · Finished {details.completedAt ? new Date(details.completedAt).toLocaleString() : "—"}</p>
                  {details.traceId && <p className="mt-1 font-mono text-[10px] text-slate-500">Trace {details.traceId}</p>}
                </div>
                <div className="flex gap-2">
                  {details.status === "FAILED" && <button type="button" disabled={busy} onClick={() => void retry()} className="btn pri disabled:opacity-50">{busy ? "Working…" : "Retry run"}</button>}
                  {ACTIVE.has(details.status) && <button type="button" disabled={busy} onClick={() => void cancel()} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-200 disabled:opacity-50">{busy ? "Working…" : "Cancel run"}</button>}
                </div>
              </div>

              {details.error && <div className="mt-4 rounded border border-rose-400/20 bg-rose-400/5 p-3"><h3 className="text-xs font-semibold text-rose-200">Run error</h3><p className="mt-1 whitespace-pre-wrap text-xs text-rose-100/80">{details.error}</p></div>}
              <JsonPanel title="Runtime input" value={details.input} />
              <JsonPanel title="Final output" value={details.output} />

              <div className="mt-5">
                <h3 className="mb-3 font-mono text-xs tracking-wider text-cyan-200">NODE STEPS</h3>
                <div className="space-y-3">
                  {details.steps?.map((step) => (
                    <article key={step.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-medium">{step.nodeId} <span className="font-normal text-slate-500">({step.nodeType})</span></h4>
                        <span className={`font-mono text-[10px] ${step.status === "FAILED" ? "text-rose-300" : step.status === "COMPLETED" ? "text-emerald-300" : "text-slate-300"}`}>{step.status} · {step.durationMs == null ? "duration pending" : `${step.durationMs} ms`} · {step.retryCount ?? 0} retries</span>
                      </div>
                      {step.error && <p className="mt-2 whitespace-pre-wrap text-xs text-rose-300">{step.error}</p>}
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <JsonPanel title="Step input" value={step.input} compact />
                        <JsonPanel title="Step output" value={step.output} compact />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>}</section>
        </div>
      )}
    </main>
  );
}

function mergeRuns(...groups: WorkflowExecutionSummary[][]): WorkflowExecutionSummary[] {
  const byId = new Map<string, WorkflowExecutionSummary>();
  for (const run of groups.flat()) byId.set(run.id, run);
  return [...byId.values()].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function JsonPanel({ title, value, compact = false }: { title: string; value: unknown; compact?: boolean }) {
  if (value === undefined || value === null) return null;
  return (
    <div className={compact ? "min-w-0" : "mt-5 min-w-0"}>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      <pre className="max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-slate-300">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
