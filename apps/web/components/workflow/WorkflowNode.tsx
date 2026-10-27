"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WorkflowNodeData } from "../../types/workflow";

const nodeStyles: Record<string, string> = {
  input: "border-cyan-400/50",
  output: "border-emerald-400/50",
  agent: "border-blue-400/50",
  reviewer: "border-violet-400/50",
  approval: "border-amber-400/60",
  llm: "border-purple-400/50",
  tool: "border-sky-400/50",
  condition: "border-orange-400/50",
};

const nodeIcons: Record<string, string> = {
  input: "IN",
  output: "OUT",
  agent: "AG",
  reviewer: "QA",
  approval: "OK",
  llm: "AI",
  tool: "API",
  condition: "IF",
};

const categoryColors: Record<string, string> = {
  CORE: "text-cyan-400",
  "AI AGENT": "text-violet-400",
  CONTROL: "text-amber-400",
  TOOLS: "text-sky-400",
};

export default function WorkflowNode({
  data,
  selected,
  type,
}: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const status = nodeData.status ?? "idle";
  const statusLabel =
    status === "running"
      ? "RUNNING"
      : status === "waiting"
        ? "WAITING"
      : status === "completed"
        ? "DONE"
        : status === "queued"
          ? "QUEUED"
          : status === "skipped"
            ? "SKIPPED"
          : status === "error"
            ? "ERROR"
            : "READY";
  const statusColor =
    status === "running"
      ? "text-cyan-300"
      : status === "waiting"
        ? "text-amber-300"
      : status === "completed"
        ? "text-emerald-400"
        : status === "skipped"
          ? "text-slate-500"
        : status === "error"
          ? "text-rose-400"
          : "text-slate-500";
  const details = [
    nodeData.toolKind?.toUpperCase(),
    nodeData.method,
    nodeData.model,
    nodeData.language,
    nodeData.endpoint ? `URL ${nodeData.endpoint}` : undefined,
    nodeData.searchQuery ? `SEARCH ${nodeData.searchQuery}` : undefined,
    nodeData.expression ? `= ${nodeData.expression}` : undefined,
    nodeData.conditionPath ? `IF ${nodeData.conditionPath} ${nodeData.conditionOperator ?? "exists"}` : undefined,
    nodeData.databaseTable ? `TABLE ${nodeData.databaseTable}` : undefined,
    nodeData.maxResults !== undefined
      ? `${nodeData.maxResults} RESULTS`
      : undefined,
    nodeData.temperature !== undefined
      ? `TEMP ${nodeData.temperature.toFixed(1)}`
      : undefined,
    nodeData.maxIterations !== undefined
      ? `${nodeData.maxIterations} ITER`
      : undefined,
  ].filter(Boolean);

  return (
    <div
      aria-label={`${nodeData.label} workflow node, ${statusLabel.toLowerCase()}`}
      className={`
        workflow-node-card relative min-w-[220px] rounded-xl border
        bg-slate-950/95 px-4 py-3
        shadow-[0_15px_40px_rgba(0,0,0,0.45)]
        backdrop-blur-xl
        transition-[border-color,box-shadow,transform] duration-300
        ${nodeStyles[type] ?? "border-white/20"}
        ${
          selected
            ? "ring-1 ring-blue-400/70 shadow-[0_0_32px_rgba(47,123,255,0.32)]"
            : ""
        }
        ${
          status === "running" || nodeData.executionPlayback
            ? "workflow-node-running border-cyan-300/90 shadow-[0_0_38px_rgba(34,211,238,0.25)]"
            : ""
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-950 !bg-cyan-300 transition-shadow hover:!shadow-[0_0_12px_rgba(34,211,238,0.9)]"
      />

      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-mono tracking-[0.15em] ${
            categoryColors[nodeData.category] ?? "text-cyan-400"
          }`}
        >
          {type === "tool"
            ? nodeIcons[nodeData.toolKind ?? "tool"]
            : nodeIcons[type] ?? "NODE"}{" "}
          {nodeData.category}
        </span>

        <span className={`flex items-center gap-1.5 font-mono text-[9px] tracking-wider ${statusColor}`}>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "running"
                ? "animate-pulse bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                : status === "waiting"
                  ? "bg-amber-300"
                : status === "completed"
                  ? "bg-emerald-400"
                  : status === "error"
                    ? "bg-rose-400"
                    : "bg-slate-600"
            }`}
          />
          {statusLabel}
        </span>
      </div>

      <div className="mt-2 text-sm font-semibold text-slate-100">
        {nodeData.label}
      </div>

      <div className="mt-1 flex items-center justify-between gap-4">
        <span className="truncate text-[11px] text-slate-400">
          {nodeData.description}
        </span>
      </div>

      {details.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.07] pt-2">
          {details.map((detail) => (
            <span
              key={detail}
              className="rounded border border-white/[0.08] bg-white/[0.035] px-1.5 py-0.5 font-mono text-[9px] text-slate-400"
            >
              {detail}
            </span>
          ))}
        </div>
      )}

      {type === "condition" ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: "35%" }}
            aria-label="Condition true output"
            className="!h-2.5 !w-2.5 !border-2 !border-slate-950 !bg-emerald-400 transition-shadow hover:!shadow-[0_0_12px_rgba(52,211,153,0.9)]"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: "65%" }}
            aria-label="Condition false output"
            className="!h-2.5 !w-2.5 !border-2 !border-slate-950 !bg-rose-400 transition-shadow hover:!shadow-[0_0_12px_rgba(251,113,133,0.9)]"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-slate-950 !bg-blue-400 transition-shadow hover:!shadow-[0_0_12px_rgba(96,165,250,0.9)]"
        />
      )}
    </div>
  );
}
