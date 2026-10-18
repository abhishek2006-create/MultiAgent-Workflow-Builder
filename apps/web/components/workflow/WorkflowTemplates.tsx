"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "../../lib/api";
import type { CreateWorkflowRequest, WorkflowEdge, WorkflowNode } from "../../types/workflow";

const templates: Array<{ name: string; description: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }> = [
  {
    name: "Research and summarize",
    description: "Summarize supplied material and pass the result to an output node. It does not browse the web.",
    nodes: [
      node("input", "input", "Input", 80, 180),
      node("research", "agent", "Research Agent", 360, 180, { agentType: "research", model: "gemini-3.8-flash", instructions: "Analyze only the supplied context. Separate evidence from inference and do not claim external research." }),
      node("output", "output", "Output", 640, 180),
    ],
    edges: [edge("input-research", "input", "research"), edge("research-output", "research", "output")],
  },
  {
    name: "Plan with approval",
    description: "Create a task plan, pause for a human decision, then return the plan.",
    nodes: [
      node("input", "input", "Input", 80, 180),
      node("planner", "agent", "Planner Agent", 350, 180, { agentType: "planner", model: "gemini-3.8-flash", instructions: "Create an ordered plan with dependencies and completion checks." }),
      node("approval", "approval", "Human Approval", 620, 180, { category: "CONTROL" }),
      node("output", "output", "Output", 890, 180),
    ],
    edges: [edge("input-planner", "input", "planner"), edge("planner-approval", "planner", "approval"), edge("approval-output", "approval", "output")],
  },
  {
    name: "Parse structured JSON",
    description: "Parse the JSON string supplied in the input.json field and return the object.",
    nodes: [
      node("input", "input", "Input", 80, 180),
      node("parse", "tool", "Parse JSON", 360, 180, { category: "TOOLS", toolKind: "json", toolOperation: "parse", inputPath: "input.json" }),
      node("output", "output", "Output", 640, 180),
    ],
    edges: [edge("input-parse", "input", "parse"), edge("parse-output", "parse", "output")],
  },
];

export default function WorkflowTemplates() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWorkflow = async (definition: CreateWorkflowRequest) => {
    setBusy(true);
    setError(null);
    try {
      const workflow = await api.workflows.create(definition);
      router.push(`/workflows/${encodeURIComponent(workflow.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create workflow.");
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      if (file.size > 1_000_000) throw new Error("Workflow files must be smaller than 1 MB.");
      const parsed: unknown = JSON.parse(await file.text());
      if (!isDefinition(parsed)) throw new Error("File must contain workflow name, nodes, and edges.");
      const result = await api.workflows.import({
        name: parsed.name,
        description: parsed.description ?? "",
        nodes: parsed.nodes as WorkflowNode[],
        edges: parsed.edges as WorkflowEdge[],
      });
      router.push(`/workflows/${encodeURIComponent(result.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import workflow.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 text-white">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-xs tracking-[0.2em] text-cyan-300">STARTER FLOWS</p><h1 className="mt-2 text-3xl font-semibold">Workflow templates</h1><p className="mt-2 text-sm text-slate-400">Create a saved copy, then configure and run it in the editor.</p></div>
        <div className="flex gap-3"><Link className="btn" href="/workflows">WORKFLOWS</Link><button className="btn" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "IMPORTING…" : "IMPORT JSON"}</button><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} /></div>
      </div>
      {error && <p role="alert" className="mb-5 rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <article key={template.name} className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-lg font-medium">{template.name}</h2><p className="mt-2 min-h-12 text-sm text-slate-400">{template.description}</p>
            <p className="mt-4 font-mono text-[10px] text-slate-500">{template.nodes.length} NODES · {template.edges.length} CONNECTIONS</p>
            <button className="btn pri mt-4" type="button" disabled={busy} onClick={() => void createWorkflow(template)}>{busy ? "CREATING…" : "USE TEMPLATE"}</button>
          </article>
        ))}
      </div>
    </main>
  );
}

function node(id: string, type: string, label: string, x: number, y: number, extra: Record<string, unknown> = {}): WorkflowNode {
  const category = type === "agent" || type === "reviewer" || type === "llm" ? "AI AGENT" : type === "tool" || type === "condition" || type === "approval" ? "TOOLS" : "CORE";
  return { id, type, position: { x, y }, data: { label, description: label, category, ...extra } } as WorkflowNode;
}

function edge(id: string, source: string, target: string): WorkflowEdge {
  return { id, source, target } as WorkflowEdge;
}

function isDefinition(value: unknown): value is { name: string; description?: string; nodes: unknown[]; edges: unknown[] } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).name === "string" &&
    Array.isArray((value as Record<string, unknown>).nodes) &&
    Array.isArray((value as Record<string, unknown>).edges));
}
