"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type AiConfiguration } from "../../lib/api";
import WorkspaceSettings from "../../components/workflow/WorkspaceSettings";

export default function SettingsPage() {
  const [configuration, setConfiguration] = useState<AiConfiguration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setConfiguration(await api.ai.configuration()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to check AI settings."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10 text-white">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-xs tracking-[0.2em] text-cyan-300">WORKSPACE SETTINGS</p><h1 className="mt-2 text-3xl font-semibold">AI connections</h1><p className="mt-2 text-sm text-slate-400">Check the AI service and choose a configured model in each workflow node.</p></div>
        <button type="button" className="btn" disabled={loading} onClick={() => void load()}>{loading ? "CHECKING…" : "CHECK AGAIN"}</button>
      </div>
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">{error}</p>}
      {configuration && <>
        <section className="mb-6 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-5" aria-live="polite">
          <h2 className="text-lg font-medium">{configuration.available ? "AI service connected" : "AI service needs attention"}</h2>
          <p className="mt-2 text-sm text-slate-300">{configuration.message ?? `Default model: ${configuration.defaultModel}. Each node has a ${configuration.nodeTimeoutMs / 1000}-second maximum deadline.`}</p>
          <p className="mt-2 text-xs text-slate-400">A configured key does not confirm model access or remaining provider credits. Errors from a run appear in its execution history.</p>
        </section>
        <div className="grid gap-5 md:grid-cols-2">{configuration.providers.map((provider) => <section key={provider.name} className="rounded-xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-medium">{provider.name}</h2><span className={provider.configured ? "text-sm text-emerald-300" : "text-sm text-amber-200"}>{provider.configured ? "Key configured" : "Key missing"}</span></div>
          <p className="mt-4 text-xs uppercase tracking-wider text-slate-400">Allowed models</p>
          <ul className="mt-3 space-y-2">{provider.models.map((model) => <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm text-cyan-200" key={model}>{model}</li>)}</ul>
          {!provider.configured && <p className="mt-4 text-sm text-amber-100">Configure {provider.name === "OpenAI" ? "OPENAI_API_KEY" : "GEMINI_API_KEY"} in the AI service environment, then restart the AI service.</p>}
        </section>)}</div>
      </>}
      <section className="mt-8 rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-medium">Start with a short workflow</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Use a template, choose a model with a configured key, and provide a short JSON object when you click Run Workflow. Research nodes analyze the material supplied in that input. Approval nodes pause until you approve or reject.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link className="btn pri" href="/templates">OPEN TEMPLATES</Link><Link className="btn" href="/workflows">MY WORKFLOWS</Link></div>
      </section>
      <WorkspaceSettings />
    </main>
  );
}
