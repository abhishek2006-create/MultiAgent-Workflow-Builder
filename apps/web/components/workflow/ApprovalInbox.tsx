"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { PendingApproval } from "../../types/workflow";

export default function ApprovalInbox() {
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string, append = false) => {
    try {
      const page = await api.approvals.pending(cursor);
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load pending approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (approval: PendingApproval, approved: boolean) => {
    setBusyId(approval.id);
    try {
      await api.approvals.resolve(approval.executionId, approval.id, approved);
      setItems((current) => current.filter((item) => item.id !== approval.id));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to resolve this approval.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 text-white">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-300">WORKSPACE QUEUE</p>
          <h1 className="mt-2 text-3xl font-semibold">Pending approvals</h1>
          <p className="mt-2 text-sm text-slate-400">Review paused workflow runs and resume or reject them.</p>
        </div>
        <button type="button" className="btn" onClick={() => void load()}>Refresh</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {loading ? <p className="text-sm text-slate-400">Loading approvals…</p> : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-slate-400">There are no pending approvals in this workspace.</div>
      ) : (
        <div className="space-y-3">
          {items.map((approval) => (
            <article key={approval.id} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.035] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-wider text-amber-200">APPROVAL REQUEST · {approval.step?.nodeId ?? "approval node"}</p>
                  <h2 className="mt-1 text-lg font-medium">{approval.execution.workflow.name}</h2>
                  <p className="mt-1 text-xs text-slate-400">Requested {new Date(approval.requestedAt).toLocaleString()} · workflow v{approval.execution.workflowVersion?.version ?? "?"}</p>
                  {approval.step?.input !== undefined && approval.step.input !== null && (
                    <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-slate-300">{JSON.stringify(approval.step.input, null, 2)}</pre>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link className="btn" href={`/workflows/${encodeURIComponent(approval.execution.workflow.id)}/history`}>Run details</Link>
                  <button type="button" disabled={busyId !== null} onClick={() => void decide(approval, false)} className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-200 disabled:opacity-50">{busyId === approval.id ? "Saving…" : "Reject"}</button>
                  <button type="button" disabled={busyId !== null} onClick={() => void decide(approval, true)} className="btn pri disabled:opacity-50">{busyId === approval.id ? "Saving…" : "Approve"}</button>
                </div>
              </div>
            </article>
          ))}
          {nextCursor && <div className="pt-2 text-center"><button type="button" className="btn" onClick={() => void load(nextCursor, true)}>Load more approvals</button></div>}
        </div>
      )}
    </main>
  );
}
