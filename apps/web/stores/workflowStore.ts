"use client";

import {
  defaultWorkflowEdges,
  defaultWorkflowNodes,
} from "../lib/workflow/defaultWorkflow";

import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";

import { create } from "zustand";

import type {
  ExecutionStatus,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeData,
  WorkflowExecution,
  WorkflowValidationError,
  WorkflowValidationWarning,
  WorkflowStatus,
} from "../types/workflow";

export interface WorkflowStore {
  workflowId: string | null;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  executionId: string | null;
  executionStatus: ExecutionStatus;
  executionDetails: WorkflowExecution | null;
  validationErrors: WorkflowValidationError[];
  validationWarnings: WorkflowValidationWarning[];
  error: string | null;

  setWorkflowMetadata: (
    data: Partial<{
      name: string;
      description: string;
    }>,
  ) => void;

  initializeNewWorkflow: () => void;

  setWorkflowId: (id: string | null) => void;

  setNodes: (nodes: WorkflowNode[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addConnection: (connection: Connection) => void;
  deleteEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setLoading: (value: boolean) => void;
  setSaving: (value: boolean) => void;
  setError: (error: string | null) => void;
  markClean: () => void;
  markDirty: () => void;

  setValidationResult: (errors: WorkflowValidationError[], warnings: WorkflowValidationWarning[]) => void;

  clearValidation: () => void;

  setExecution: (executionId: string | null, status: ExecutionStatus) => void;
  setExecutionDetails: (details: WorkflowExecution | null) => void;
  hydrate: (workflow: Workflow) => void;
  acceptSaved: (workflow: Workflow, snapshot: Pick<WorkflowStore, "name" | "description" | "nodes" | "edges">) => void;
  reset: () => void;
}

const initialState: Omit<WorkflowStore, "setWorkflowMetadata" | "setWorkflowId" | "setNodes" | "onNodesChange" | "addNode" | "updateNode" | "deleteNode" | "duplicateNode" | "setEdges" | "onEdgesChange" | "addConnection" | "deleteEdge" | "selectNode" | "setLoading" | "setSaving" | "setError" | "markClean" | "markDirty" | "setValidationResult" | "clearValidation" | "setExecution" | "setExecutionDetails" | "initializeNewWorkflow" | "hydrate" | "acceptSaved" | "reset"> = {
  workflowId: null,
  name: "Untitled Workflow",
  description: "",
  status: "DRAFT" as WorkflowStatus,
  version: 1,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  executionId: null,
  executionStatus: "IDLE" as ExecutionStatus,
  executionDetails: null,
  validationErrors: [],
  validationWarnings: [],
  error: null,
};

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  ...initialState,

  setWorkflowMetadata: (data) => {
    set((state) => ({
      ...state,
      ...data,
      isDirty: true,
    }));
  },

  initializeNewWorkflow: () => {
    set({
      ...initialState,
      nodes: [...defaultWorkflowNodes],
      edges: [...defaultWorkflowEdges],
    });
  },

  setWorkflowId: (id) => {
    set({
      workflowId: id,
    });
  },

  setNodes: (nodes) => {
    set({
      nodes,
      isDirty: true,
    });
  },

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: state.isDirty || changes.some((change) => change.type !== "select" && change.type !== "dimensions"),
    }));
  },

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    }));
  },

  updateNode: (nodeId, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node,
      ),
      isDirty: true,
    }));
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
      selectedNodeId:
        state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    }));
  },

  duplicateNode: (nodeId) => {
    set((state) => {
      const source = state.nodes.find((node) => node.id === nodeId);

      if (!source) {
        return state;
      }

      const duplicate: WorkflowNode = {
        ...source,
        id: `${source.type}-${crypto.randomUUID()}`,
        position: {
          x: source.position.x + 80,
          y: source.position.y + 80,
        },
        data: {
          ...source.data,
          label: `${source.data.label} Copy`,
        },
        selected: false,
      };

      return {
        nodes: [...state.nodes, duplicate],
        isDirty: true,
      };
    });
  },

  setEdges: (edges) => {
    set({
      edges,
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: state.isDirty || changes.some((change) => change.type !== "select"),
    }));
  },

  addConnection: (connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          animated: false,
        },
        state.edges,
      ),
      isDirty: true,
    }));
  },

  deleteEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
      isDirty: true,
    }));
  },

  selectNode: (nodeId) => {
    set({
      selectedNodeId: nodeId,
    });
  },

  setLoading: (value) => {
    set({
      isLoading: value,
    });
  },

  setSaving: (value) => {
    set({
      isSaving: value,
    });
  },

  setError: (error) => {
    set({
      error,
    });
  },

  markClean: () => {
    set({
      isDirty: false,
    });
  },

  markDirty: () => {
    set({
      isDirty: true,
    });
  },

  setValidationResult: (errors, warnings) => {
    set({
      validationErrors: errors,
      validationWarnings: warnings,
    });
  },

  clearValidation: () => {
    set({
      validationErrors: [],
      validationWarnings: [],
    });
  },

  setExecution: (executionId, status) => {
    set({
      executionId,
      executionStatus: status,
    });
  },

  setExecutionDetails: (details) => set({ executionDetails: details }),

  acceptSaved: (workflow, snapshot) => {
    set((state) => ({
      workflowId: workflow.id,
      version: workflow.version,
      status: workflow.status,
      // Keep edits made during the request and preserve the execution console.
      isDirty: state.name !== snapshot.name || state.description !== snapshot.description
        || state.nodes !== snapshot.nodes || state.edges !== snapshot.edges,
    }));
  },

  hydrate: (workflow) => {
    set({
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      version: workflow.version,
      nodes: workflow.nodes,
      edges: workflow.edges,
      selectedNodeId: null,
      isLoading: false,
      isSaving: false,
      isDirty: false,
      executionId: null,
      executionStatus: "IDLE",
      executionDetails: null,
      validationErrors: [],
      validationWarnings: [],
      error: null,
    });
  },

  reset: () => {
    set({
      ...initialState,
    });
  },
}));
