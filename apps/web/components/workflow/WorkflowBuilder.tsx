// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// import {
//   addEdge,
//   applyEdgeChanges,
//   applyNodeChanges,
//   type Connection,
//   type Edge,
//   type Node,
//   type OnEdgesChange,
//   type OnNodesChange,
//   type ReactFlowInstance,
// } from "@xyflow/react";

// import NodeInspector from "./NodeInspector";
// import NodePalette from "./NodePalette";
// import WorkflowCanvas from "./WorkflowCanvas";
// import WorkflowToolbar from "./WorkflowToolbar";

// import type { WorkflowNodeData } from "../../types/workflow";
// import type { WorkflowToolKind } from "../../types/workflow";

// type FlowWorkflowNodeData = WorkflowNodeData & Record<string, unknown>;
// type WorkflowFlowInstance = ReactFlowInstance<Node<FlowWorkflowNodeData>, Edge>;

// function isSavedWorkflow(
//   value: unknown,
// ): value is { name: string; nodes: Node<FlowWorkflowNodeData>[]; edges: Edge[] } {
//   if (!isRecord(value)) return false;

//   return (
//     typeof value.name === "string" &&
//     Array.isArray(value.nodes) &&
//     value.nodes.every(
//       (node) =>
//         isRecord(node) &&
//         typeof node.id === "string" &&
//         typeof node.type === "string" &&
//         isRecord(node.position) &&
//         typeof node.position.x === "number" &&
//         typeof node.position.y === "number" &&
//         isRecord(node.data) &&
//         typeof node.data.label === "string",
//     ) &&
//     Array.isArray(value.edges) &&
//     value.edges.every(
//       (edge) =>
//         isRecord(edge) &&
//         typeof edge.id === "string" &&
//         typeof edge.source === "string" &&
//         typeof edge.target === "string",
//     )
//   );
// }

// function isRecord(value: unknown): value is Record<string, unknown> {
//   return typeof value === "object" && value !== null && !Array.isArray(value);
// }

// const initialNodes: Node<FlowWorkflowNodeData>[] = [
//   {
//     id: "input",
//     type: "input",
//     position: { x: 450, y: 20 },
//     data: {
//       label: "Input",
//       description: "User request",
//       category: "CORE",
//     },
//   },

//   {
//     id: "planner",
//     type: "agent",
//     position: { x: 450, y: 160 },
//     data: {
//       label: "Planner Agent",
//       description: "Gemini",
//       category: "AI AGENT",
//       model: "Gemini",
//       instructions:
//         "Break the task into clear execution steps.",
//       temperature: 0.7,
//       maxIterations: 10,
//     },
//   },

//   {
//     id: "research",
//     type: "agent",
//     position: { x: 200, y: 320 },
//     data: {
//       label: "Research Agent",
//       description: "Gemini · 3 tools",
//       category: "AI AGENT",
//       model: "Gemini",
//       instructions:
//         "Research the task carefully and return structured findings.",
//       temperature: 0.4,
//       maxIterations: 10,
//     },
//   },

//   {
//     id: "coding",
//     type: "agent",
//     position: { x: 700, y: 320 },
//     data: {
//       label: "Coding Agent",
//       description: "Gemini · 2 tools",
//       category: "AI AGENT",
//       model: "Gemini",
//       instructions:
//         "Implement the required solution and explain the result.",
//       temperature: 0.3,
//       maxIterations: 12,
//     },
//   },

//   {
//     id: "reviewer",
//     type: "reviewer",
//     position: { x: 450, y: 490 },
//     data: {
//       label: "Reviewer Agent",
//       description: "Gemini · memory",
//       category: "AI AGENT",
//       model: "Gemini",
//       instructions:
//         "Review outputs for correctness and quality.",
//       temperature: 0.2,
//       maxIterations: 5,
//     },
//   },

//   {
//     id: "approval",
//     type: "approval",
//     position: { x: 450, y: 630 },
//     data: {
//       label: "Human Approval",
//       description: "Manual gate",
//       category: "CONTROL",
//     },
//   },

//   {
//     id: "output",
//     type: "output",
//     position: { x: 450, y: 770 },
//     data: {
//       label: "Output",
//       description: "Final report",
//       category: "CORE",
//     },
//   },
// ];

// const initialEdges: Edge[] = [
//   {
//     id: "input-planner",
//     source: "input",
//     target: "planner",
//     animated: true,
//   },
//   {
//     id: "planner-research",
//     source: "planner",
//     target: "research",
//     animated: true,
//   },
//   {
//     id: "planner-coding",
//     source: "planner",
//     target: "coding",
//     animated: true,
//   },
//   {
//     id: "research-reviewer",
//     source: "research",
//     target: "reviewer",
//     animated: true,
//   },
//   {
//     id: "coding-reviewer",
//     source: "coding",
//     target: "reviewer",
//     animated: true,
//   },
//   {
//     id: "reviewer-approval",
//     source: "reviewer",
//     target: "approval",
//     animated: true,
//   },
//   {
//     id: "approval-output",
//     source: "approval",
//     target: "output",
//     animated: true,
//   },
// ];

// interface WorkflowBuilderProps {
//   workflowId?: string;
// }

// export default function WorkflowBuilder({
//   workflowId,
// }: WorkflowBuilderProps) {
//   const [nodes, setNodes] =
//     useState<Node<FlowWorkflowNodeData>[]>(initialNodes);

//   const [edges, setEdges] =
//     useState<Edge[]>(initialEdges);

//   const [selectedNodeId, setSelectedNodeId] =
//     useState<string | null>("research");

//   const [running, setRunning] = useState(false);
//   const [workflowName, setWorkflowName] = useState("Research & Build Pipeline");
//   const canvasRef = useRef<HTMLDivElement | null>(null);
//   const flowInstanceRef = useRef<WorkflowFlowInstance | null>(null);
//   const nextNodeId = useRef(0);
//   const storageKey = `flowforge:workflow:${workflowId ?? "draft"}`;

//   useEffect(() => {
//     try {
//       const savedWorkflow = window.localStorage.getItem(storageKey);
//       if (!savedWorkflow) return;

//       const parsed: unknown = JSON.parse(savedWorkflow);
//       if (!isSavedWorkflow(parsed)) {
//         throw new Error("Saved workflow data has an invalid format.");
//       }

//       setWorkflowName(parsed.name);
//       setNodes(parsed.nodes);
//       setEdges(parsed.edges);
//       setSelectedNodeId(parsed.nodes[0]?.id ?? null);
//       requestAnimationFrame(() => {
//         requestAnimationFrame(() => {
//           void flowInstanceRef.current?.fitView({
//             padding: 0.16,
//             duration: 350,
//           });
//         });
//       });
//     } catch (error) {
//       console.error("Unable to load saved workflow.", error);
//       window.alert(
//         "This workflow could not be loaded. Check browser storage or saved workflow data.",
//       );
//     }
//   }, [storageKey]);

//   const initializeFlow = useCallback((instance: WorkflowFlowInstance) => {
//     flowInstanceRef.current = instance;
//     requestAnimationFrame(() => {
//       requestAnimationFrame(() => {
//         void instance.fitView({ padding: 0.16, duration: 0 });
//       });
//     });
//   }, []);

//   const selectedNode = useMemo(
//     () =>
//       nodes.find(
//         (node) => node.id === selectedNodeId,
//       ) ?? null,
//     [nodes, selectedNodeId],
//   );

//   const onNodesChange: OnNodesChange<Node<FlowWorkflowNodeData>> =
//     useCallback((changes) => {
//       setNodes((currentNodes) =>
//         applyNodeChanges(changes, currentNodes),
//       );
//     }, []);

//   const onEdgesChange: OnEdgesChange = useCallback(
//     (changes) => {
//       setEdges((currentEdges) =>
//         applyEdgeChanges(changes, currentEdges),
//       );
//     },
//     [],
//   );

//   const onConnect = useCallback(
//     (connection: Connection) => {
//       setEdges((currentEdges) =>
//         addEdge(
//           {
//             ...connection,
//             animated: true,
//             type: "workflow",
//           },
//           currentEdges,
//         ),
//       );
//     },
//     [],
//   );

//   const updateSelectedNode = useCallback(
//     (updates: Partial<WorkflowNodeData>) => {
//       if (!selectedNodeId) return;

//       setNodes((currentNodes) =>
//         currentNodes.map((node) =>
//           node.id === selectedNodeId
//             ? {
//                 ...node,
//                 data: {
//                   ...node.data,
//                   ...updates,
//                 },
//               }
//             : node,
//         ),
//       );
//     },
//     [selectedNodeId],
//   );

//   const addNode = useCallback(
//     (type: string, label?: string, requestedToolKind?: WorkflowToolKind) => {
//       const id = `${type}-${Date.now()}-${nextNodeId.current++}`;
//       const labels: Record<string, string> = {
//         input: "Input",
//         output: "Output",
//         agent: "AI Agent",
//         llm: "LLM",
//         reviewer: "Reviewer Agent",
//         approval: "Human Approval",
//         condition: "Condition",
//         tool: "Tool",
//       };
//       const descriptions: Record<string, string> = {
//         input: "Workflow input",
//         output: "Workflow result",
//         condition: "Route by condition",
//         approval: "Requires human review",
//       };
//       const toolDescriptions: Record<WorkflowToolKind, string> = {
//         http: "Configure an HTTP request",
//         search: "Search the web",
//         calculator: "Evaluate an expression",
//         database: "Query a database",
//         code: "Run a code step",
//       };
//       const categories: Record<string, string> = {
//         input: "CORE",
//         output: "CORE",
//         agent: "AI AGENT",
//         llm: "AI AGENT",
//         reviewer: "AI AGENT",
//         approval: "CONTROL",
//         condition: "CONTROL",
//         tool: "TOOLS",
//       };
//       const toolKind =
//         type === "tool" ? requestedToolKind ?? "http" : undefined;
//       const isAiNode =
//         type === "agent" || type === "reviewer" || type === "llm";
//       const description = toolKind
//         ? toolDescriptions[toolKind]
//         : descriptions[type] ?? "Configure node";

//       const canvasBounds = canvasRef.current?.getBoundingClientRect();
//       const flow = flowInstanceRef.current;
//       let position = {
//         x: 300 + nodes.length * 24,
//         y: 250 + nodes.length * 18,
//       };

//       if (
//         flow &&
//         canvasBounds &&
//         canvasBounds.width > 0 &&
//         canvasBounds.height > 0
//       ) {
//         const zoom = Math.max(flow.getZoom(), 0.25);
//         const nodeWidth = 250 / zoom;
//         const nodeHeight = 150 / zoom;
//         const padding = 24;
//         const firstVisible = flow.screenToFlowPosition({
//           x: canvasBounds.left + padding,
//           y: canvasBounds.top + padding,
//         });
//         const lastVisible = flow.screenToFlowPosition({
//           x: canvasBounds.right - padding,
//           y: canvasBounds.bottom - padding,
//         });
//         const center = flow.screenToFlowPosition({
//           x: canvasBounds.left + canvasBounds.width / 2,
//           y: canvasBounds.top + canvasBounds.height / 2,
//         });
//         const candidates: Array<{ x: number; y: number; distance: number }> = [];

//         for (
//           let y = firstVisible.y;
//           y + nodeHeight <= lastVisible.y;
//           y += nodeHeight + 18 / zoom
//         ) {
//           for (
//             let x = firstVisible.x;
//             x + nodeWidth <= lastVisible.x;
//             x += nodeWidth + 18 / zoom
//           ) {
//             const overlapsNode = nodes.some(
//               (node) =>
//                 x < node.position.x + nodeWidth &&
//                 x + nodeWidth > node.position.x &&
//                 y < node.position.y + nodeHeight &&
//                 y + nodeHeight > node.position.y,
//             );

//             if (!overlapsNode) {
//               const dx = x + nodeWidth / 2 - center.x;
//               const dy = y + nodeHeight / 2 - center.y;
//               candidates.push({ x, y, distance: dx * dx + dy * dy });
//             }
//           }
//         }

//         candidates.sort((first, second) => first.distance - second.distance);

//         if (candidates.length > 0) {
//           position = { x: candidates[0].x, y: candidates[0].y };
//         } else {
//           const rightmostNode = nodes.reduce(
//             (rightmost, node) =>
//               Math.max(rightmost, node.position.x + nodeWidth),
//             firstVisible.x,
//           );
//           position = {
//             x: rightmostNode + 24 / zoom,
//             y: center.y - nodeHeight / 2,
//           };
//         }
//       }

//       const newNode: Node<FlowWorkflowNodeData> = {
//         id,
//         type,
//         position,
//         data: {
//           label: label ?? labels[type] ?? "New Node",
//           description,
//           category: categories[type] ?? "CORE",
//           toolKind,
//           method: toolKind === "http" ? "GET" : undefined,
//           maxResults: toolKind === "search" ? 5 : undefined,
//           expression: toolKind === "calculator" ? "1 + 1" : undefined,
//           language: toolKind === "code" ? "JavaScript" : undefined,
//           model: isAiNode ? "Gemini" : undefined,
//           instructions: isAiNode ? "Configure instructions..." : undefined,
//           temperature: isAiNode ? 0.7 : undefined,
//           maxIterations: isAiNode ? 10 : undefined,
//         },
//       };

//       setNodes((current) => [...current, newNode]);
//       setSelectedNodeId(id);
//       if (flow) {
//         requestAnimationFrame(() => {
//           requestAnimationFrame(() => {
//             void flow.fitView({ padding: 0.16, duration: 350 });
//           });
//         });
//       }
//     },
//     [nodes],
//   );

//   const saveWorkflow = () => {
//     try {
//       window.localStorage.setItem(
//         storageKey,
//         JSON.stringify({ name: workflowName, nodes, edges }),
//       );
//       window.alert("Workflow saved in this browser.");
//     } catch (error) {
//       console.error("Unable to save workflow.", error);
//       window.alert("Workflow could not be saved. Check available browser storage.");
//     }
//   };

//   const validateWorkflow = () => {
//     if (nodes.length === 0) {
//       alert("Workflow has no nodes.");
//       return;
//     }

//     if (edges.length === 0) {
//       alert("Workflow has no connections.");
//       return;
//     }

//     alert(
//       `Workflow valid — ${nodes.length} nodes, ${edges.length} edges.`,
//     );
//   };

//   const runWorkflow = async () => {
//     if (running) return;

//     const incomingSources = new Map(
//       nodes.map((node) => [node.id, [] as string[]]),
//     );
//     edges.forEach((edge) => incomingSources.get(edge.target)?.push(edge.source));

//     const pendingNodeIds = new Set(nodes.map((node) => node.id));
//     const executionStages: string[][] = [];

//     while (pendingNodeIds.size > 0) {
//       const readyNodeIds = nodes
//         .filter(
//           (node) =>
//             pendingNodeIds.has(node.id) &&
//             (incomingSources.get(node.id) ?? []).every(
//               (sourceId) => !pendingNodeIds.has(sourceId),
//             ),
//         )
//         .map((node) => node.id);

//       if (readyNodeIds.length === 0) {
//         alert("Cannot run this workflow because it contains a cycle.");
//         return;
//       }

//       executionStages.push(readyNodeIds);
//       readyNodeIds.forEach((nodeId) => pendingNodeIds.delete(nodeId));
//     }

//     setRunning(true);
//     setNodes((currentNodes) =>
//       currentNodes.map((node) => ({
//         ...node,
//         data: { ...node.data, status: "idle" },
//       })),
//     );

//     try {
//       for (const stage of executionStages) {
//         const activeNodeIds = new Set(stage);
//         setNodes((currentNodes) =>
//           currentNodes.map((node) =>
//             activeNodeIds.has(node.id)
//               ? { ...node, data: { ...node.data, status: "running" } }
//               : node,
//           ),
//         );

//         await new Promise<void>((resolve) => window.setTimeout(resolve, 700));

//         setNodes((currentNodes) =>
//           currentNodes.map((node) =>
//             activeNodeIds.has(node.id)
//               ? { ...node, data: { ...node.data, status: "completed" } }
//               : node,
//           ),
//         );
//       }

//     } finally {
//       setRunning(false);
//     }
//   };

//   return (
//     <div className="flex h-[calc(100vh-64px)] min-h-162.5 flex-col bg-[#05070b] text-slate-100">
//       <WorkflowToolbar
//         workflowName={
//           workflowId
//             ? `${workflowName.toUpperCase()} • ${workflowId}`
//             : workflowName.toUpperCase()
//         }
//         onRun={runWorkflow}
//         onSave={saveWorkflow}
//         onValidate={validateWorkflow}
//       />

//       {running && (
//         <div className="h-0.5 w-full overflow-hidden bg-white/5">
//           <div className="h-full w-1/3 animate-pulse bg-linear-to-r from-blue-500 to-cyan-400" />
//         </div>
//       )}

//       <div className="flex min-h-0 flex-1">
//         <NodePalette onAddNode={addNode} />

//         <WorkflowCanvas
//           nodes={nodes}
//           edges={edges}
//           isRunning={running}
//           canvasRef={canvasRef}
//           onInit={initializeFlow}
//           onNodesChange={onNodesChange}
//           onEdgesChange={onEdgesChange}
//           onConnect={onConnect}
//           onNodeClick={(node) =>
//             setSelectedNodeId(node.id)
//           }
//         />

//         <NodeInspector
//           node={selectedNode}
//           onUpdate={updateSelectedNode}
//         />
//       </div>
//     </div>
//   );
// }

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
} from "@xyflow/react";

import NodeInspector from "./NodeInspector";
import NodePalette from "./NodePalette";
import WorkflowCanvas from "./WorkflowCanvas";
import WorkflowToolbar from "./WorkflowToolbar";

import {
  useWorkflowStore,
} from "../../stores/workflowStore";

import {
  useWorkflowApi,
} from "../../hooks/useWorkflowApi";

import type {
  WorkflowNodeData,
  WorkflowToolKind,
} from "../../types/workflow";

interface WorkflowBuilderProps {
  workflowId?: string;
}

export default function WorkflowBuilder({
  workflowId,
}: WorkflowBuilderProps) {
  const nodes =
    useWorkflowStore(
      (state) => state.nodes,
    );

  const edges =
    useWorkflowStore(
      (state) => state.edges,
    );

  const selectedNodeId =
    useWorkflowStore(
      (state) => state.selectedNodeId,
    );

  const name =
    useWorkflowStore(
      (state) => state.name,
    );

  const executionStatus = useWorkflowStore((state) => state.executionStatus);
  const executionId = useWorkflowStore((state) => state.executionId);
  const executionDetails = useWorkflowStore((state) => state.executionDetails);
  const [playbackNodeId, setPlaybackNodeId] = useState<string | null>(null);
  const playbackExecutionRef = useRef<string | null>(null);
  const playbackStepsRef = useRef(executionDetails?.steps ?? []);
  playbackStepsRef.current = executionDetails?.steps ?? [];

  const isLoading =
    useWorkflowStore(
      (state) => state.isLoading,
    );

  const isSaving =
    useWorkflowStore(
      (state) => state.isSaving,
    );

  const [isRunning, setIsRunning] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!executionId) {
      playbackExecutionRef.current = null;
      setPlaybackNodeId(null);
      return;
    }
    if (["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(executionStatus)) {
      setPlaybackNodeId(null);
      return;
    }
    if (executionStatus !== "COMPLETED" || playbackExecutionRef.current === executionId) return;

    const completedSteps = playbackStepsRef.current.filter((step) => step.status === "COMPLETED");
    playbackExecutionRef.current = executionId;
    if (!completedSteps.length) return;
    let current = 0;
    setPlaybackNodeId(completedSteps[current].nodeId);
    const timer = window.setInterval(() => {
      current += 1;
      if (current >= completedSteps.length) {
        window.clearInterval(timer);
        setPlaybackNodeId(null);
        return;
      }
      setPlaybackNodeId(completedSteps[current].nodeId);
    }, 450);
    return () => window.clearInterval(timer);
  }, [executionId, executionStatus]);

  const isDirty =
    useWorkflowStore(
      (state) => state.isDirty,
    );

  const error =
    useWorkflowStore(
      (state) => state.error,
    );

  const setNodes =
    useWorkflowStore(
      (state) => state.setNodes,
    );

  const addNode =
    useWorkflowStore(
      (state) => state.addNode,
    );

  const updateNode =
    useWorkflowStore(
      (state) => state.updateNode,
    );

  const selectNode =
    useWorkflowStore(
      (state) => state.selectNode,
    );

  const onNodesChange =
    useWorkflowStore(
      (state) => state.onNodesChange,
    );

  const onEdgesChange =
    useWorkflowStore(
      (state) => state.onEdgesChange,
    );

  const addConnection =
    useWorkflowStore(
      (state) => state.addConnection,
    );

  const selectedNode =
    useMemo(
      () =>
        nodes.find(
          (node) =>
            node.id ===
            selectedNodeId,
        ) ?? null,
      [
        nodes,
        selectedNodeId,
      ],
    );

  const liveStep = executionDetails?.steps?.find((step) =>
    step.status === "RUNNING" || step.status === "WAITING_APPROVAL",
  );
  const highlightedNodeId = liveStep?.nodeId ?? playbackNodeId;
  const displayedNodes = useMemo(() => {
    const steps = new Map(executionDetails?.steps?.map((step) => [step.nodeId, step]));
    return nodes.map((node) => {
      const step = steps.get(node.id);
      const status = node.id === highlightedNodeId
        ? "running"
        : step?.status === "COMPLETED"
          ? "completed"
          : step?.status === "FAILED"
            ? "error"
            : step?.status === "SKIPPED"
              ? "skipped"
            : executionStatus === "QUEUED"
              ? "queued"
              : node.data.status ?? "idle";
      return { ...node, data: { ...node.data, status } };
    });
  }, [nodes, executionDetails, executionStatus, highlightedNodeId]);

  const displayedEdges = useMemo(() => {
    const completed = new Set(
      executionDetails?.steps?.filter((step) => step.status === "COMPLETED").map((step) => step.nodeId) ?? [],
    );
    return edges.map((edge) => {
      const flowing = Boolean(highlightedNodeId && edge.target === highlightedNodeId);
      const complete = completed.has(edge.source) && completed.has(edge.target);
      return {
        ...edge,
        animated: flowing,
        style: {
          ...edge.style,
          stroke: flowing ? "#67e8f9" : complete ? "#34d399" : "rgba(100,180,255,0.35)",
          strokeWidth: flowing ? 3 : complete ? 2.2 : 1.6,
        },
      };
    });
  }, [edges, executionDetails, highlightedNodeId]);

  const workflowIsExecuting = ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(executionStatus);

  const {
    loadWorkflow,
    saveWorkflow,
    validateWorkflow,
    runWorkflow,
    resolveApproval,
    retryExecution,
  } = useWorkflowApi();

  const initializeNewWorkflow = useWorkflowStore(
    (state) => state.initializeNewWorkflow,
  );

  /* ================================== */
  /* Load workflow                      */
  /* ================================== */

  useEffect(() => {
    // "demo" is the app's entry point for a new workflow, not a persisted ID.
    if (workflowId === "demo") {
      initializeNewWorkflow();
      return;
    }

    if (!workflowId) {
      return;
    }

    void loadWorkflow(workflowId);
  }, [
    initializeNewWorkflow,
    workflowId,
    loadWorkflow,
  ]);

  /* ================================== */
  /* Node creation                      */
  /* ================================== */

  const handleAddNode = useCallback(
    (type: string, label: string, toolKind?: WorkflowToolKind) => {
      const id =
        `${type}-${crypto.randomUUID()}`;

      const node = {
        id,

        type,

        position: {
          x: 450 + Math.random() * 150,
          y: 150 + Math.random() * 150,
        },

        data: {
          label,

          description:
            "Workflow node",

          category:
            type === "tool"
              ? "TOOLS"
              : type === "condition" || type === "approval"
                ? "CONTROL"
              : type === "agent" ||
            type === "llm"
                ? "AI AGENT"
                : "CORE",
          ...(toolKind ? { toolKind } : {}),
          ...(toolKind === "calculator" ? { expression: "1 + 1" } : {}),
          ...(type === "condition"
            ? { conditionPath: "input.message", conditionOperator: "exists" as const }
            : {}),
        },
      };

      addNode(node);
    },
    [addNode],
  );

  /* ================================== */
  /* Selection                          */
  /* ================================== */

  const handleNodeClick = useCallback(
    (node: Node<WorkflowNodeData>) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  /* ================================== */
  /* Node update                        */
  /* ================================== */

  const handleUpdateNode =
    useCallback(
      (
        updates: Partial<WorkflowNodeData>,
      ) => {
        if (!selectedNodeId) {
          return;
        }

        updateNode(
          selectedNodeId,
          updates,
        );
      },
      [
        selectedNodeId,
        updateNode,
      ],
    );

  /* ================================== */
  /* Save                               */
  /* ================================== */

  const handleSave =
    useCallback(async () => {
      try {
        await saveWorkflow();
      } catch {
        // Store already contains error.
      }
    }, [saveWorkflow]);

  /* ================================== */
  /* Validate                           */
  /* ================================== */

  const handleValidate =
    useCallback(async () => {
      try {
        await validateWorkflow();
      } catch {
        // Store already contains error.
      }
    }, [validateWorkflow]);

  /* ================================== */
  /* Run                                */
  /* ================================== */

  const handleRun =
    useCallback(async () => {
      if (isRunning) {
        return;
      }

      setIsRunning(true);
      try {
        if (isDirty) {
          await saveWorkflow();
        }

        await runWorkflow();
      } catch {
        // Store already contains error.
      } finally {
        setIsRunning(false);
      }
    }, [
      isRunning,
      isDirty,
      saveWorkflow,
      runWorkflow,
    ]);

  const handleRetry = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      await retryExecution();
    } catch {
      // Store already contains error.
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, retryExecution]);

  const handleCanvasInit = useCallback(
    (instance: ReactFlowInstance<Node<WorkflowNodeData>, Edge>) => {
      requestAnimationFrame(() => {
        void instance.fitView({ padding: 0.16, duration: 350 });
      });
    },
    [],
  );

  return (
    <section className="flex h-screen flex-col bg-[#05070b] text-white">
      <WorkflowToolbar
        workflowName={name}
        onSave={handleSave}
        onValidate={handleValidate}
        onRun={handleRun}
        executionStatus={executionStatus}
      />

      {executionDetails && (
        <section aria-label="Execution console" className="border-b border-white/10 bg-slate-950/80 px-5 py-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-400">
            <span>Execution {executionDetails.id.slice(0, 12)}</span>
            <div className="flex items-center gap-3">
              <span>{executionDetails.status.replaceAll("_", " ")}</span>
              {executionDetails.status === "FAILED" && (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => void handleRetry()}
                  className="rounded border border-cyan-400/30 px-2 py-1 text-cyan-200 disabled:opacity-50"
                >
                  {isRunning ? "Retrying…" : "Retry failed run"}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {executionDetails.steps?.map((step) => (
              <div key={step.id} className="max-w-full rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px]">
                <span className="text-slate-200">{step.nodeId}</span>
                <span className="ml-2 text-cyan-200">{step.status}</span>
                {step.error && <p className="mt-1 max-w-[320px] truncate text-rose-300">{step.error}</p>}
              </div>
            ))}
          </div>
          {executionDetails.output && (
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-slate-300">
              {JSON.stringify(executionDetails.output, null, 2)}
            </pre>
          )}
        </section>
      )}

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {executionStatus === "WAITING_APPROVAL" && executionId && executionDetails?.approvals
        ?.filter((approval) => approval.status === "PENDING")
        .map((approval) => (
          <div key={approval.id} className="flex items-center gap-3 border-b border-amber-400/20 bg-amber-400/10 px-5 py-3 text-xs text-amber-100">
            <span className="flex-1">This run is waiting for a workspace member to approve the next step.</span>
            <button type="button" className="rounded border border-emerald-400/30 px-3 py-1" onClick={() => void resolveApproval(approval.id, true).catch(() => undefined)}>Approve</button>
            <button type="button" className="rounded border border-rose-400/30 px-3 py-1" onClick={() => void resolveApproval(approval.id, false).catch(() => undefined)}>Reject</button>
          </div>
        ))}

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-xl border border-white/10 bg-slate-950 px-5 py-3 text-sm">
            Loading workflow...
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <NodePalette
          onAddNode={handleAddNode}
        />

        <WorkflowCanvas
          nodes={displayedNodes}
          edges={displayedEdges}
          isRunning={isRunning || workflowIsExecuting}
          canvasRef={canvasRef}
          onInit={handleCanvasInit}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={
            (connection: Connection) =>
              addConnection(connection)
          }
          onNodeClick={
            handleNodeClick
          }
        />

        <NodeInspector
          node={selectedNode}
          onUpdate={
            handleUpdateNode
          }
        />
      </div>

      {isSaving && (
        <div className="pointer-events-none fixed bottom-5 right-5 rounded-lg border border-white/10 bg-slate-950/90 px-4 py-2 text-xs text-slate-300 shadow-xl">
          Saving workflow...
        </div>
      )}
    </section>
  );
}
