"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ExecutionStatus } from "../../types/workflow";

interface WorkflowToolbarProps {
  workflowName: string;
  workflowId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isBusy: boolean;
  onRename: (name: string) => void;
  onRun: () => void;
  onSave: () => void;
  onValidate: () => void;
  onCancel?: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  executionStatus: ExecutionStatus;
}

export default function WorkflowToolbar({
  workflowName,
  workflowId,
  isDirty,
  isSaving,
  isBusy,
  onRename,
  onRun,
  onSave,
  onValidate,
  onCancel,
  onImport,
  onExport,
  executionStatus,
}: WorkflowToolbarProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="workflow-topbar flex min-h-[58px] flex-wrap items-center gap-3 border-b border-white/10 bg-slate-950/70 px-5 py-2">
      <Link href="/workflows"
        className="disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
      >
        ← Back
      </Link>

      <input aria-label="Workflow name" value={workflowName} maxLength={120}
        onChange={(event) => onRename(event.target.value)}
        className="min-w-0 rounded border border-white/10 bg-transparent px-2 py-1 font-mono text-sm font-bold text-slate-100" />

      <span aria-live="polite" className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-500">
        {isSaving ? "SAVING…" : !workflowId ? "DRAFT" : isDirty ? "UNSAVED CHANGES" : "SAVED"}
      </span>

      <div className="flex-1" />

      {executionStatus !== "IDLE" && (
        <span aria-live="polite" className="rounded-md border border-cyan-400/20 px-2 py-1 font-mono text-[10px] text-cyan-200">
          RUN {executionStatus.replaceAll("_", " ")}
        </span>
      )}

      {workflowId && <Link className="disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5" href={`/workflows/${encodeURIComponent(workflowId)}/history`}>History</Link>}
      <button type="button" onClick={onExport} className="disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Export</button>
      <button type="button" disabled={isBusy || isSaving} onClick={() => fileInput.current?.click()} className="disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Import</button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onImport(file);
          event.currentTarget.value = "";
        }}
      />

      {onCancel && ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(executionStatus) && (
        <button type="button" disabled={isBusy} onClick={onCancel} className="disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200 hover:bg-red-400/10">
          Cancel run
        </button>
      )}

      <button type="button" disabled={isBusy || isSaving} onClick={onSave} className="disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5">{isSaving ? "Saving…" : "Save"}</button>
      <button type="button" disabled={isBusy || isSaving} onClick={onValidate} className="disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5">Validate</button>
      <button
        type="button"
        disabled={isBusy || isSaving || ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(executionStatus)}
        onClick={onRun}
        className="disabled:cursor-not-allowed disabled:opacity-50 rounded-lg border border-blue-400/60 bg-gradient-to-r from-blue-600/40 to-violet-600/40 px-5 py-2 text-xs font-semibold tracking-wider text-white shadow-[0_0_20px_rgba(47,123,255,0.25)] transition hover:scale-[1.02]"
      >
        ▶ RUN WORKFLOW
      </button>
    </div>
  );
}
