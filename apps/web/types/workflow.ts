
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
  | "text"
  | "json"
  | "date"
  | "calculator";

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
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  toolKind?: WorkflowToolKind;
  endpoint?: string;
  method?: "GET" | "POST";
  searchQuery?: string;
  maxResults?: number;
  expression?: string;
  toolOperation?: string;
  inputPath?: string;
  endDatePath?: string;
  days?: number;
  searchText?: string;
  replaceText?: string;
  fieldPath?: string;
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
  thinkingLevel?: "low" | "medium" | "high";
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
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
  createdAt?: string;
  traceId?: string | null;
  input?: unknown;
  workflowVersion?: { version: number; snapshot?: unknown };
  steps?: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: string;
    input?: unknown;
    output?: unknown;
    error?: string | null;
    retryCount?: number;
    durationMs?: number | null;
    startedAt?: string | null;
    completedAt?: string | null;
    usage?: unknown;
  }>;
  approvals?: Array<{
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    comment?: string | null;
  }>;
}

export interface WorkflowExecutionSummary {
  id: string;
  status: ExecutionStatus;
  input?: unknown;
  output?: unknown;
  error?: string | null;
  traceId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  workflowVersion?: { version: number } | null;
  _count?: { steps: number };
}

export interface WorkflowExecutionHistoryPage {
  items: WorkflowExecutionSummary[];
  nextCursor: string | null;
}

export interface PendingApproval {
  id: string;
  executionId: string;
  requestedAt: string;
  decision?: unknown;
  step?: { nodeId: string; nodeType: string; input?: unknown } | null;
  execution: {
    id: string;
    status: string;
    traceId?: string | null;
    workflow: { id: string; name: string };
    workflowVersion?: { version: number } | null;
  };
}

export interface DashboardOverview {
  workflowCount: number;
  executionCount: number;
  statuses: Record<string, number>;
  successRate: number | null;
  recentUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  recentExecutions: Array<{
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
    traceId: string | null;
    version: number | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number | null;
    error: string | null;
    stepCount: number;
  }>;
}

