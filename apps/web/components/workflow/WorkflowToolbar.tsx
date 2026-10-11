"use client";

import type { ExecutionStatus } from "../../types/workflow";

interface WorkflowToolbarProps {
  workflowName: string;
  onRun: () => void;
  onSave: () => void;
  onValidate: () => void;
  executionStatus: ExecutionStatus;
}

export default function WorkflowToolbar({
  workflowName,
  onRun,
  onSave,
  onValidate,
  executionStatus,
}: WorkflowToolbarProps) {
  return (
    <div className="flex min-h-[58px] items-center gap-3 border-b border-white/10 bg-slate-950/70 px-5">
      <button
        type="button"
        className="
          rounded-lg border border-white/10
          px-3 py-2 text-xs text-slate-300
          hover:bg-white/5
        "
        onClick={() => history.back()}
      >
        ← Back
      </button>

      <div className="font-mono text-sm font-bold tracking-wider text-slate-100">
        {workflowName}
      </div>

      <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-500">
        DRAFT
      </span>

      <div className="flex-1" />

      {executionStatus !== "IDLE" && (
        <span aria-live="polite" className="rounded-md border border-cyan-400/20 px-2 py-1 font-mono text-[10px] text-cyan-200">
          RUN {executionStatus.replaceAll("_", " ")}
        </span>
      )}

      <button
        type="button"
        onClick={onSave}
        className="
          rounded-lg border border-white/10
          px-4 py-2 text-xs text-slate-300
          hover:bg-white/5
        "
      >
        Save
      </button>

      <button
        type="button"
        onClick={onValidate}
        className="
          rounded-lg border border-white/10
          px-4 py-2 text-xs text-slate-300
          hover:bg-white/5
        "
      >
        Validate
      </button>

      <button
        type="button"
        onClick={onRun}
        className="
          rounded-lg border border-blue-400/60
          bg-gradient-to-r from-blue-600/40 to-violet-600/40
          px-5 py-2 text-xs font-semibold
          tracking-wider text-white
          shadow-[0_0_20px_rgba(47,123,255,0.25)]
          transition hover:scale-[1.02]
        "
      >
        ▶ RUN WORKFLOW
      </button>
    </div>
  );
}
