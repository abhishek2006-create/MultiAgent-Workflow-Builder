"use client";

import {
  BackgroundVariant,
  BaseEdge,
  Background,
  Controls,
  getBezierPath,
  MiniMap,
  ReactFlow,
  type EdgeProps,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import type { RefObject } from "react";

import "@xyflow/react/dist/style.css";

import WorkflowNode from "./WorkflowNode";
import type { WorkflowNodeData } from "../../types/workflow";

interface WorkflowCanvasProps {
  nodes: Node<WorkflowNodeData & Record<string, unknown>>[];
  edges: Edge[];
  isRunning: boolean;
  isReplaying?: boolean;
  isWaiting?: boolean;
  canvasRef: RefObject<HTMLDivElement | null>;
  onInit: (
    instance: ReactFlowInstance<
      Node<WorkflowNodeData & Record<string, unknown>>,
      Edge
    >,
  ) => void;
  onNodesChange: OnNodesChange<Node<WorkflowNodeData & Record<string, unknown>>>;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onNodeClick: (node: Node<WorkflowNodeData & Record<string, unknown>>) => void;
}

function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  selected,
  animated,
  style,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <g>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "rgba(103,232,249,0.9)" : "rgba(100,180,255,0.42)",
          strokeWidth: selected ? 2.5 : 1.6,
          ...style,
        }}
      />
      {animated && (<>
        <path
          aria-hidden="true"
          className="workflow-edge-pulse"
          d={edgePath}
          style={{ stroke: String(style?.stroke ?? "#67e8f9"), color: String(style?.stroke ?? "#67e8f9") }}
        />
        <circle className="workflow-edge-particle" r="4" fill={String(style?.stroke ?? "#67e8f9")} aria-hidden="true">
          <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
        </circle>
      </>)}
    </g>
  );
}

const edgeTypes = {
  workflow: WorkflowEdge,
};

const nodeTypes = {
  input: WorkflowNode,
  output: WorkflowNode,
  agent: WorkflowNode,
  llm: WorkflowNode,
  reviewer: WorkflowNode,
  approval: WorkflowNode,
  condition: WorkflowNode,
  tool: WorkflowNode,
};

export default function WorkflowCanvas({
  nodes,
  edges,
  isRunning,
  isReplaying = false,
  isWaiting = false,
  canvasRef,
  onInit,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
}: WorkflowCanvasProps) {
  const runCompleted =
    !isRunning &&
    nodes.length > 0 &&
    nodes.every((node) => node.data.status === "completed");

  return (
    <div
      ref={canvasRef}
      className="workflow-canvas relative h-full flex-1 overflow-hidden"
    >
      <div aria-hidden="true" className="workflow-canvas-ambient" />
      <ReactFlow
        style={{ background: "transparent", zIndex: 1 }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick(node)}
        nodesDraggable={!isRunning}
        nodesConnectable={!isRunning}
        minZoom={0.2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        colorMode="dark"
        defaultEdgeOptions={{
          type: "workflow",
          animated: false,
          style: {
            stroke: "rgba(100,180,255,0.35)",
            strokeWidth: 2,
          },
        }}
        proOptions={{
          hideAttribution: true,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.1}
          color="rgba(150,180,255,0.24)"
        />

        <Controls />

        <MiniMap
          nodeColor={(node) => {
            if (node.data.status === "running") return "#22d3ee";
            if (node.data.status === "waiting") return "#fbbf24";
            if (node.data.status === "completed") return "#34d399";
            if (node.type === "input" || node.type === "output") return "#22d3ee";
            if (node.type === "reviewer") return "#a78bfa";
            if (node.type === "approval") return "#fbbf24";
            if (node.type === "tool") return "#38bdf8";
            return "#2f7bff";
          }}
          maskColor="rgba(0,0,0,0.65)"
        />
      </ReactFlow>

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[10px] text-slate-400 backdrop-blur">
        DRAG · CONNECT · CONFIGURE
      </div>

      <div
        aria-live="polite"
        className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 font-mono text-[10px] text-slate-400 shadow-lg shadow-black/20 backdrop-blur"
      >
        <span className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isRunning
                ? "animate-pulse bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]"
                : runCompleted
                  ? "bg-emerald-400"
                  : "bg-slate-500"
            }`}
          />
          {isWaiting ? "WAITING FOR APPROVAL" : isReplaying ? "COMPLETED · PATH REPLAY" : isRunning
            ? "EXECUTING"
            : runCompleted
              ? "RUN COMPLETE"
              : "CANVAS READY"}
        </span>
        <span className="h-3 w-px bg-white/10" />
        <span>{nodes.length} NODES</span>
        <span>{edges.length} CONNECTIONS</span>
      </div>
    </div>
  );
}
