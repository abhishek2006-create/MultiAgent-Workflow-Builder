import type { MarkerType } from "@xyflow/react";
import type { WorkflowEdge, WorkflowExecution } from "../../types/workflow";

export function executionEdges(edges: WorkflowEdge[], steps: WorkflowExecution["steps"] = [], playbackNodeId: string | null = null): WorkflowEdge[] {
  const byNode = new Map(steps?.map((step) => [step.nodeId, step]));
  return edges.map((edge) => {
    const source = byNode.get(edge.source);
    const target = byNode.get(edge.target);
    const branch = source?.output && typeof source.output === "object" && "branch" in source.output
      ? (source.output as { branch: unknown }).branch : undefined;
    const inactive = source?.status === "SKIPPED" || target?.status === "SKIPPED" ||
      (["true", "false"].includes(String(edge.sourceHandle)) && branch !== undefined && branch !== edge.sourceHandle);
    const flowing = !inactive && source?.status === "COMPLETED" && (target?.status === "RUNNING" || edge.target === playbackNodeId);
    const complete = !inactive && source?.status === "COMPLETED" && target?.status === "COMPLETED";
    const color = inactive ? "#5b6152" : target?.status === "FAILED" ? "#fb7185"
      : target?.status === "WAITING_APPROVAL" ? "#fbbf24" : flowing ? "#e2eaa0" : complete ? "#a5c77c" : "#717b56";
    return {
      ...edge, type: "workflow", animated: flowing,
      markerEnd: { type: "arrowclosed" as MarkerType, color, width: 18, height: 18 },
      style: { ...edge.style, stroke: color, strokeWidth: flowing ? 3 : complete ? 2.2 : 1.6, opacity: inactive ? 0.35 : 1 },
    };
  });
}
