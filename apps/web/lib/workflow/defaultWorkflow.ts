import type {
  WorkflowEdge,
  WorkflowNode,
} from "../../types/workflow";

export const defaultWorkflowNodes: WorkflowNode[] = [
  {
    id: "input",
    type: "input",
    position: {
      x: 100,
      y: 250,
    },
    data: {
      label: "Input",
      description: "Workflow input",
      category: "CORE",
    },
  },

  {
    id: "planner",
    type: "agent",
    position: {
      x: 380,
      y: 250,
    },
    data: {
      label: "Planner Agent",
      agentType: "planner",
      description: "Creates execution plan",
      category: "AI AGENT",

      provider: "Google",
      model: "gemini-3.5-flash-lite",
      timeoutMs: 60000,
      thinkingLevel: "low",
      maxTokens: 1024,

      instructions:
        "Analyze the user request and create a structured execution plan.",

      temperature: 0.7,
      maxIterations: 10,
    },
  },

  {
    id: "research",
    type: "agent",
    position: {
      x: 680,
      y: 120,
    },
    data: {
      label: "Research Agent",
      agentType: "research",
      description: "Performs research",
      category: "AI AGENT",

      provider: "Google",
      model: "gemini-3.5-flash-lite",
      timeoutMs: 60000,
      thinkingLevel: "low",
      maxTokens: 1024,

      instructions:
        "Research the required information and return reliable findings.",

      temperature: 0.5,
      maxIterations: 10,
    },
  },

  {
    id: "coding",
    type: "agent",
    position: {
      x: 680,
      y: 380,
    },
    data: {
      label: "Coding Agent",
      agentType: "coding",
      description: "Generates implementation",
      category: "AI AGENT",

      provider: "Google",
      model: "gemini-3.5-flash-lite",
      timeoutMs: 60000,
      thinkingLevel: "low",
      maxTokens: 1024,

      instructions:
        "Implement the requested solution using clean production-quality code.",

      temperature: 0.3,
      maxIterations: 15,
    },
  },

  {
    id: "reviewer",
    type: "reviewer",
    position: {
      x: 980,
      y: 250,
    },
    data: {
      label: "Reviewer Agent",
      agentType: "reviewer",
      description: "Reviews generated result",
      category: "AI AGENT",

      provider: "Google",
      model: "gemini-3.5-flash-lite",
      timeoutMs: 60000,
      thinkingLevel: "low",
      maxTokens: 1024,

      instructions:
        "Review the result for correctness, quality and security.",

      temperature: 0.2,
      maxIterations: 5,
    },
  },

  {
    id: "approval",
    type: "approval",
    position: {
      x: 1260,
      y: 250,
    },
    data: {
      label: "Human Approval",
      description: "Requires human decision",
      category: "CONTROL",
    },
  },

  {
    id: "output",
    type: "output",
    position: {
      x: 1530,
      y: 250,
    },
    data: {
      label: "Output",
      description: "Final workflow output",
      category: "CORE",
    },
  },
];

export const defaultWorkflowEdges: WorkflowEdge[] = [
  {
    id: "input-planner",
    source: "input",
    target: "planner",
  },

  {
    id: "planner-research",
    source: "planner",
    target: "research",
  },

  {
    id: "planner-coding",
    source: "planner",
    target: "coding",
  },

  {
    id: "research-reviewer",
    source: "research",
    target: "reviewer",
  },

  {
    id: "coding-reviewer",
    source: "coding",
    target: "reviewer",
  },

  {
    id: "reviewer-approval",
    source: "reviewer",
    target: "approval",
  },

  {
    id: "approval-output",
    source: "approval",
    target: "output",
  },
];
