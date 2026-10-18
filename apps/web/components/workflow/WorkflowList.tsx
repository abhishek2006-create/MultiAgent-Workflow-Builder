"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Workflow } from "../../types/workflow";

export default function WorkflowList() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setWorkflows(await api.workflows.list());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load workflows.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const duplicate = async (workflow: Workflow) => {
    setDuplicatingId(workflow.id);
    setError(null);
    try {
      const created = await api.workflows.create({
        name: `Copy of ${workflow.name}`.slice(0, 120),
        description: workflow.description,
        nodes: structuredClone(workflow.nodes),
        edges: structuredClone(workflow.edges),
      });
      router.push(`/workflows/${encodeURIComponent(created.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to duplicate workflow.");
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 text-white">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-xs tracking-[0.2em] text-cyan-300">WORKSPACE</p><h1 className="mt-2 text-3xl font-semibold">Workflows</h1><p className="mt-2 text-sm text-slate-400">Your saved workflow definitions and versions.</p></div>
        <Link className="btn pri" href="/workflows/demo">NEW WORKFLOW</Link>
      </div>
      {error && <p role="alert" className="mb-5 rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      {loading ? <p className="text-sm text-slate-400">Loading workflows…</p> : workflows.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <article key={workflow.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-start justify-between gap-3"><h2 className="font-medium">{workflow.name}</h2><span className="font-mono text-[10px] text-slate-400">v{workflow.version}</span></div>
              <p className="mt-2 min-h-10 text-sm text-slate-400">{workflow.description || "No description."}</p>
              <p className="mt-4 font-mono text-[10px] text-slate-500">UPDATED {new Date(workflow.updatedAt).toLocaleString()}</p>
              <div className="mt-4 flex gap-2">
                <Link className="btn pri" href={`/workflows/${encodeURIComponent(workflow.id)}`}>OPEN</Link>
                <Link className="btn" href={`/workflows/${encodeURIComponent(workflow.id)}/history`}>HISTORY</Link>
                <button type="button" className="btn" disabled={duplicatingId !== null} onClick={() => void duplicate(workflow)}>{duplicatingId === workflow.id ? "COPYING…" : "DUPLICATE"}</button>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="rounded-xl border border-dashed border-white/15 p-10 text-center"><h2 className="text-lg">No saved workflows</h2><p className="mt-2 text-sm text-slate-400">Start with a blank canvas or choose a template.</p><div className="mt-5 flex justify-center gap-3"><Link className="btn pri" href="/workflows/demo">NEW WORKFLOW</Link><Link className="btn" href="/templates">BROWSE TEMPLATES</Link></div></div>}
    </section>
  );
}
