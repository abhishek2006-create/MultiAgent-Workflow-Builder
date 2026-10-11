
import type { Edge, Node } from "@xyflow/react";

export type WorkflowNodeType =
  | "input"
  | "output"
  | "agent"
  | "llm"
  | "reviewer"
  | "approval"
  | "condition"
  | "tool";

export type WorkflowToolKind =
  | "http"
  | "search"
  | "calculator"
  | "database"
  | "code";

export type WorkflowConditionOperator =
  | "exists"
  | "truthy"
  | "equals"
  | "notEquals"
  | "contains"
  | "greaterThan"
  | "lessThan";


export type WorkflowStatus =
  | "DRAFT"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

export type ExecutionStatus =
  | "IDLE"
  | "QUEUED"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface WorkflowNodeData {
  label: string;
  description: string;
  category: string;
  status?: "idle" | "queued" | "running" | "completed" | "error" | "skipped";
  toolKind?: WorkflowToolKind;
  endpoint?: string;
  method?: "GET" | "POST";
  searchQuery?: string;
  maxResults?: number;
  expression?: string;
  databaseTable?: string;
  databaseQuery?: string;
  language?: string;
  code?: string;
  conditionPath?: string;
  conditionOperator?: WorkflowConditionOperator;
  conditionValue?: string;
  model?: string;
  provider?: string;
  instructions?: string;
  temperature?: number;
  maxTokens?: number;
  maxIterations?: number;
  tools?: string[];
  memory?: boolean;
  [key: string]: unknown;
}

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export type WorkflowNode = Node<WorkflowNodeData>;

export type WorkflowEdge = Edge;

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}


export interface WorkflowConfig {
  name: string;
  description: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface ValidateWorkflowResponse {
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationWarning[];
}

export interface WorkflowValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface WorkflowValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}


export interface RunWorkflowRequest {
  input?: Record<string, unknown>;
}

export interface RunWorkflowResponse {
  executionId: string;
  status: ExecutionStatus;
}


export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string
  error?: string;
  output?: Record<string, unknown>;
  steps?: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: string;
    output?: unknown;
    error?: string | null;
  }>;
  approvals?: Array<{
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    comment?: string | null;
  }>;
}

