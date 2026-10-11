"use client";

import type { WorkflowToolKind } from "../../types/workflow";

interface NodePaletteProps {
  onAddNode: (type: string, label: string, toolKind?: WorkflowToolKind) => void;
}

interface PaletteNode {
  type: string;
  icon: string;
  label: string;
  toolKind?: WorkflowToolKind;
}

const groups: { name: string; nodes: PaletteNode[] }[] = [
  {
    name: "CORE",
    nodes: [
      { type: "input", icon: "IN", label: "Input" },
      { type: "output", icon: "OUT", label: "Output" },
      { type: "condition", icon: "IF", label: "Condition" },
    ],
  },
  {
    name: "AI",
    nodes: [
      { type: "llm", icon: "AI", label: "LLM" },
      { type: "agent", icon: "AG", label: "Agent" },
      { type: "reviewer", icon: "QA", label: "Reviewer" },
    ],
  },
  {
    name: "TOOLS",
    nodes: [
      { type: "tool", toolKind: "http", icon: "API", label: "HTTP Request" },
      { type: "tool", toolKind: "search", icon: "WEB", label: "Web Search" },
      { type: "tool", toolKind: "calculator", icon: "CALC", label: "Calculator" },
      { type: "tool", toolKind: "database", icon: "DB", label: "Database" },
      { type: "tool", toolKind: "code", icon: "</>", label: "Code Executor" },
    ],
  },
  {
    name: "CONTROL",
    nodes: [
      { type: "approval", icon: "OK", label: "Human Approval" },
    ],
  },
];

export default function NodePalette({
  onAddNode,
}: NodePaletteProps) {
  return (
    <aside className="w-[210px] shrink-0 overflow-y-auto border-r border-white/10 bg-slate-950/40 p-4">
      <h3 className="mb-5 font-mono text-xs font-bold tracking-[0.15em] text-slate-200">
        NODE LIBRARY
      </h3>

      {groups.map((group) => (
        <div key={group.name} className="mb-5">
          <h4 className="mb-2 font-mono text-[10px] tracking-[0.2em] text-slate-500">
            {group.name}
          </h4>

          <div className="space-y-1.5">
            {group.nodes.map((node, index) => (
              <button
                key={`${node.label}-${index}`}
                type="button"
                aria-label={`Add ${node.label} node`}
                title={`Add ${node.label} node`}
                onClick={() => onAddNode(node.type, node.label, node.toolKind)}
                className="
                  flex w-full items-center gap-3
                  rounded-lg border border-white/10
                  bg-white/[0.035]
                  px-3 py-2
                  text-left text-xs text-slate-300
                  transition
                  hover:border-blue-500/50
                  hover:bg-blue-500/10
                  hover:translate-x-1
                "
              >
                <span className="w-8 shrink-0 text-center font-mono text-[9px] font-bold tracking-tight text-cyan-400">
                  {node.icon}
                </span>

                <span>{node.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}