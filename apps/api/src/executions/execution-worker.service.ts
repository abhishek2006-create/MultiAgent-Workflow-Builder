import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AiClientService } from "../ai/ai-client.service";
import { evaluateCondition } from "./node-runtime";
import { resolveAgentType } from "./agent-types";
import { executeBuiltInTool, resolveInputPath, type BuiltInToolKind } from "./tool-registry";
import { readyGraphNodes } from "./graph-scheduler";
import { jsonSchemaValueErrors } from "./input-schema";
import { configuredNodeRetries, isRetryableNodeError, nodeRetryDelayMs } from "./node-retry";

type GraphNode = { id: string; type: string; data?: Record<string, unknown> };
type GraphEdge = { source: string; target: string; sourceHandle?: string | null };

@Injectable()
export class ExecutionWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecutionWorkerService.name);
  private timer?: NodeJS.Timeout;
  private working = false;
  private readonly workerId = randomUUID();
  private readonly leaseDurationMs = 60_000;
  private readonly heartbeatIntervalMs = 10_000;
  private readonly nodeConcurrency = 4;

  constructor(private readonly prisma: PrismaService, private readonly ai: AiClientService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.processNext(), 1_000);
    void this.processNext();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async processNext(): Promise<void> {
    if (this.working) return;
    this.working = true;
    try {
      const executionId = await this.prisma.$transaction(async (tx) => {
        const candidates = await tx.$queryRaw<Array<{ id: string; startedAt: Date | null }>>`
          SELECT e."id", e."startedAt"
          FROM "WorkflowExecution" e
          LEFT JOIN "ExecutionWorkerLease" l ON l."executionId" = e."id"
          WHERE (
            (e."status" = 'QUEUED' AND (l."executionId" IS NULL OR l."leaseExpiresAt" <= CURRENT_TIMESTAMP))
            OR (e."status" = 'RUNNING' AND (l."executionId" IS NULL OR l."leaseExpiresAt" <= CURRENT_TIMESTAMP))
          )
          ORDER BY e."createdAt" ASC
          FOR UPDATE OF e SKIP LOCKED
          LIMIT 1
        `;
        const candidate = candidates[0];
        if (!candidate) return null;
        const now = new Date();
        const leaseExpiresAt = new Date(now.getTime() + this.leaseDurationMs);
        await tx.executionWorkerLease.upsert({
          where: { executionId: candidate.id },
          create: { executionId: candidate.id, workerId: this.workerId, leaseExpiresAt },
          update: { workerId: this.workerId, leaseExpiresAt },
        });
        const claimed = await tx.workflowExecution.updateMany({
          where: { id: candidate.id, status: { in: ["QUEUED", "RUNNING"] } },
          data: { status: "RUNNING", startedAt: candidate.startedAt ?? now, error: null },
        });
        if (claimed.count !== 1) {
          await tx.executionWorkerLease.deleteMany({ where: { executionId: candidate.id, workerId: this.workerId } });
          return null;
        }
        return candidate.id;
      });
      if (executionId) await this.execute(executionId);
    } catch (error) {
      this.logger.error("Execution worker tick failed", error instanceof Error ? error.stack : undefined);
    } finally {
      this.working = false;
    }
  }

  private async execute(executionId: string): Promise<void> {
    let activeNodeId: string | undefined;
    let leaseLost = false;
    const heartbeat = setInterval(() => {
      void this.prisma.executionWorkerLease.updateMany({
        where: {
          executionId,
          workerId: this.workerId,
          leaseExpiresAt: { gt: new Date() },
        },
        data: { leaseExpiresAt: new Date(Date.now() + this.leaseDurationMs) },
      }).then((result) => {
        if (result.count !== 1) leaseLost = true;
      }).catch(() => { leaseLost = true; });
    }, this.heartbeatIntervalMs);
    try {
      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id: executionId },
        include: { workflowVersion: true, steps: true },
      });
      if (!execution?.workflowVersion) throw new Error("Pinned workflow version is missing");
      const snapshot = asRecord(execution.workflowVersion.snapshot);
      const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes as GraphNode[] : [];
      const edges = Array.isArray(snapshot.edges) ? snapshot.edges as GraphEdge[] : [];
      const ordered = topologicalOrder(nodes, edges);
      const previousSteps = new Map(execution.steps.map((step) => [step.nodeId, step]));
      const nodesById = new Map(nodes.map((node) => [node.id, node]));
      const outputs = new Map<string, unknown>();
      const runInput = asRecord(execution.input);
      const processed = new Set<string>();
      for (const [nodeId, step] of previousSteps) {
        if (step.status === "COMPLETED") {
          outputs.set(nodeId, step.output);
          processed.add(nodeId);
        } else if (step.status === "SKIPPED") {
          processed.add(nodeId);
        }
      }

      while (processed.size < ordered.length) {
        if (leaseLost) throw new LostExecutionLeaseError();
        const ready = readyGraphNodes(ordered, edges, processed, this.nodeConcurrency);
        if (ready.length === 0) throw new Error("Execution graph has nodes with unresolved dependencies");
        const readyWithoutApproval = ready.filter((node) => node.type !== "approval");

        if (readyWithoutApproval.length > 0) {
          const runnable: GraphNode[] = [];
          for (const node of readyWithoutApproval) {
            const allIncoming = edges.filter((edge) => edge.target === node.id);
            const incoming = this.activeIncomingEdges(allIncoming, nodesById, outputs);
            if (allIncoming.length > 0 && incoming.length === 0) {
              await this.persistSkippedStep(executionId, node);
              processed.add(node.id);
              continue;
            }
            runnable.push(node);
          }

          const results = await Promise.allSettled(runnable.map(async (node) => {
            const allIncoming = edges.filter((edge) => edge.target === node.id);
            const incoming = this.activeIncomingEdges(allIncoming, nodesById, outputs);
            const nodeInput = incoming.length === 0
              ? runInput
              : Object.fromEntries(incoming.map((edge) => [edge.source, outputs.get(edge.source)]));
            const startedAt = new Date();
            const maxRetries = configuredNodeRetries(node.data);
            const step = await this.withLease(executionId, (tx) => tx.workflowExecutionStep.upsert({
              where: { executionId_nodeId: { executionId, nodeId: node.id } },
              create: {
                executionId,
                nodeId: node.id,
                nodeType: node.type,
                status: "RUNNING",
                input: jsonValue(nodeInput),
                startedAt,
              },
              update: {
                nodeType: node.type,
                status: "RUNNING",
                input: jsonValue(nodeInput),
                error: null,
                startedAt,
                completedAt: null,
              },
            }));

            for (let attempt = step.retryCount; ; attempt += 1) {
              if (leaseLost) throw new LostExecutionLeaseError();
              await this.withLease(executionId, (tx) => tx.workflowExecutionStep.update({
                where: { id: step.id },
                data: { retryCount: attempt },
              }));
              try {
                const value = await this.executeNode(node, nodeInput, runInput);
                if (node.data?.outputSchema !== undefined) {
                  const validationErrors = jsonSchemaValueErrors(value, node.data.outputSchema);
                  if (validationErrors.length > 0) {
                    throw new Error(`Output does not match the configured schema: ${validationErrors.join("; ")}`);
                  }
                }
                await this.withLease(executionId, (tx) => tx.workflowExecutionStep.update({
                  where: { id: step.id },
                  data: {
                    status: "COMPLETED",
                    output: jsonValue(value),
                    error: null,
                    usage: isRecord(value) && isRecord(value.usage)
                      ? jsonValue(value.usage)
                      : Prisma.DbNull,
                    completedAt: new Date(),
                    durationMs: Date.now() - startedAt.getTime(),
                  },
                }));
                return { nodeId: node.id, value };
              } catch (error) {
                if (error instanceof LostExecutionLeaseError) throw error;
                const message = error instanceof Error ? error.message : "Node execution failed";
                const canRetry = attempt < maxRetries && isRetryableNodeError(error, node.type);
                if (canRetry) {
                  await this.withLease(executionId, (tx) => tx.workflowExecutionStep.update({
                    where: { id: step.id },
                    data: { retryCount: attempt + 1, error: `Attempt ${attempt + 1} failed; retrying: ${message}`.slice(0, 2000) },
                  }));
                  await new Promise((resolve) => setTimeout(resolve, nodeRetryDelayMs(attempt)));
                  continue;
                }
                await this.withLease(executionId, (tx) => tx.workflowExecutionStep.updateMany({
                  where: { id: step.id, status: "RUNNING" },
                  data: { status: "FAILED", retryCount: attempt, error: message.slice(0, 2000), completedAt: new Date(), durationMs: Date.now() - startedAt.getTime() },
                }));
                throw new Error(`Node "${node.id}" failed: ${message}`, { cause: error });
              }
            }
          }));

          const failures: string[] = [];
          for (let index = 0; index < results.length; index += 1) {
            const result = results[index];
            if (result.status === "rejected") {
              if (result.reason instanceof LostExecutionLeaseError) throw result.reason;
              activeNodeId ??= runnable[index]?.id;
              failures.push(result.reason instanceof Error ? result.reason.message : "Node execution failed");
              continue;
            }
            outputs.set(result.value.nodeId, result.value.value);
            processed.add(result.value.nodeId);
          }
          if (failures.length > 0) throw new Error(failures.join("; ").slice(0, 2000));
          continue;
        }

        const node = ready[0];
        if (leaseLost) throw new LostExecutionLeaseError();
        activeNodeId = node.id;
        const allIncoming = edges.filter((edge) => edge.target === node.id);
        const incoming = this.activeIncomingEdges(allIncoming, nodesById, outputs);
        if (allIncoming.length > 0 && incoming.length === 0) {
          await this.persistSkippedStep(executionId, node);
          processed.add(node.id);
          continue;
        }
        const nodeInput = incoming.length === 0
          ? runInput
          : Object.fromEntries(incoming.map((edge) => [edge.source, outputs.get(edge.source)]));
        const startedAt = new Date();
        const step = await this.withLease(executionId, (tx) => tx.workflowExecutionStep.upsert({
          where: { executionId_nodeId: { executionId, nodeId: node.id } },
          create: { executionId, nodeId: node.id, nodeType: node.type, status: "RUNNING", input: jsonValue(nodeInput), startedAt },
          update: { nodeType: node.type, status: "RUNNING", input: jsonValue(nodeInput), error: null, startedAt, completedAt: null },
        }));
        await this.withLease(executionId, async (tx) => {
          await tx.workflowExecutionStep.update({
            where: { id: step.id },
            data: { status: "WAITING_APPROVAL", completedAt: new Date(), durationMs: Date.now() - startedAt.getTime() },
          });
          await tx.approval.create({
            data: { executionId, stepId: step.id, status: "PENDING", decision: jsonValue(nodeInput) },
          });
          await tx.workflowExecution.update({ where: { id: executionId }, data: { status: "WAITING_APPROVAL" } });
          await tx.executionWorkerLease.deleteMany({ where: { executionId, workerId: this.workerId } });
        });
        return;
      }

      const outputNodes = ordered.filter((node) => node.type === "output" && outputs.has(node.id));
      if (outputNodes.length === 0) throw new Error("Workflow completed without producing an output");
      const finalOutput = outputNodes.length === 1
        ? outputs.get(outputNodes[0].id)
        : Object.fromEntries(outputNodes.map((node) => [node.id, outputs.get(node.id)]));
      await this.withLease(executionId, async (tx) => {
        await tx.workflowExecution.update({
          where: { id: executionId },
          data: { status: "COMPLETED", output: jsonValue(finalOutput ?? {}), completedAt: new Date(), error: null },
        });
        await tx.executionWorkerLease.deleteMany({ where: { executionId, workerId: this.workerId } });
      });
    } catch (error) {
      if (error instanceof LostExecutionLeaseError || leaseLost) {
        this.logger.warn(`Worker ${this.workerId} lost the lease for execution ${executionId}; leaving it to the current lease owner`);
        return;
      }
      const message = error instanceof Error ? error.message : "Execution failed";
      this.logger.error(`Execution ${executionId} failed at node ${activeNodeId ?? "startup"}`, error instanceof Error ? error.stack : undefined);
      try {
        await this.withLease(executionId, async (tx) => {
          if (activeNodeId) {
            await tx.workflowExecutionStep.updateMany({
              where: { executionId, nodeId: activeNodeId, status: "RUNNING" },
              data: { status: "FAILED", error: message.slice(0, 2000), completedAt: new Date() },
            });
          }
          await tx.workflowExecution.updateMany({
            where: { id: executionId, status: "RUNNING" },
            data: { status: "FAILED", error: message.slice(0, 2000), completedAt: new Date() },
          });
          await tx.executionWorkerLease.deleteMany({ where: { executionId, workerId: this.workerId } });
        });
      } catch (leaseError) {
        if (!(leaseError instanceof LostExecutionLeaseError)) throw leaseError;
      }
    } finally {
      clearInterval(heartbeat);
      await this.prisma.executionWorkerLease.deleteMany({ where: { executionId, workerId: this.workerId } }).catch(() => undefined);
    }
  }

  private async withLease<T>(executionId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const execution = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "WorkflowExecution" WHERE "id" = ${executionId} FOR UPDATE
      `;
      const lease = await tx.executionWorkerLease.findUnique({ where: { executionId } });
      if (!execution.length || !lease || lease.workerId !== this.workerId || lease.leaseExpiresAt <= new Date()) {
        throw new LostExecutionLeaseError();
      }
      return operation(tx);
    });
  }

  private async executeNode(node: GraphNode, input: unknown, runInput: Record<string, unknown>): Promise<unknown> {
    switch (node.type) {
      case "input":
        return runInput;
      case "output":
        return input;
      case "agent":
      case "llm":
      case "reviewer": {
        const data = node.data ?? {};
        const mappedInput = typeof data.inputPath === "string" && data.inputPath.trim()
          ? resolveInputPath(input, data.inputPath)
          : input;
        if (mappedInput === undefined) throw new Error(`AI node "${node.id}" input mapping did not resolve`);
        const message = JSON.stringify(data.inputPath ? mappedInput : { request: runInput, upstream: mappedInput },
          (key, value) => key === "searchSuggestionsHtml" ? undefined : value);
        if (message.length > 8_000) throw new Error("AI node input exceeds 8,000 characters. Configure an input mapping to select the fields this node needs.");
        const agentType = resolveAgentType(node.type, data);
        const selectedModel = data.model === "Gemini" ? "gemini-3.5-flash-lite" : data.model;
        const result = await this.ai.support({
          customer_message: message,
          ...(typeof data.instructions === "string" ? { instructions: data.instructions } : {}),
          agent_type: agentType,
          ...(typeof selectedModel === "string" && /^(gemini|gpt)-/.test(selectedModel) ? { model: selectedModel } : {}),
          ...(typeof data.temperature === "number" ? { temperature: data.temperature } : {}),
          ...(typeof data.thinkingLevel === "string" ? { thinking_level: data.thinkingLevel as "low" | "medium" | "high" } : {}),
          ...(typeof data.maxTokens === "number" ? { max_output_tokens: data.maxTokens } : {}),
          ...(typeof data.timeoutMs === "number" ? { timeout_ms: data.timeoutMs } : {}),
        });
        return { ...result, content: result.message };
      }
      case "condition":
        return evaluateCondition(node.data ?? {}, input);
      case "tool": {
        const toolKind = node.data?.toolKind;
        if (toolKind === "web-search") {
          const query = node.data?.searchQuery || resolveInputPath(input, String(node.data?.inputPath ?? "input.query"));
          if (typeof query !== "string" || !query.trim() || query.length > 2000) throw new Error("Web search requires a query of 1–2000 characters.");
          return this.ai.search(query.trim(), Number(node.data?.maxResults ?? 5));
        }
        if (!["calculator", "text", "json", "date"].includes(String(toolKind))) {
          throw new Error(`Tool kind "${String(toolKind ?? "unknown")}" is not enabled`);
        }
        return executeBuiltInTool(toolKind as BuiltInToolKind, node.data ?? {}, input);
      }
      default:
        throw new Error(`Node type "${node.type}" is not executable yet`);
    }
  }

  private activeIncomingEdges(
    edges: GraphEdge[],
    nodesById: Map<string, GraphNode>,
    outputs: Map<string, unknown>,
  ): GraphEdge[] {
    return edges.filter((edge) => {
      const source = nodesById.get(edge.source);
      if (source?.type === "condition") {
        const branch = asRecord(outputs.get(edge.source)).branch;
        return (branch === "true" || branch === "false") && edge.sourceHandle === branch;
      }
      return outputs.has(edge.source);
    });
  }

  private async persistSkippedStep(executionId: string, node: GraphNode): Promise<void> {
    const skippedAt = new Date();
    await this.withLease(executionId, (tx) => tx.workflowExecutionStep.upsert({
      where: { executionId_nodeId: { executionId, nodeId: node.id } },
      create: {
        executionId,
        nodeId: node.id,
        nodeType: node.type,
        status: "SKIPPED",
        input: {},
        startedAt: skippedAt,
        completedAt: skippedAt,
      },
      update: {
        nodeType: node.type,
        status: "SKIPPED",
        input: {},
        output: Prisma.DbNull,
        error: null,
        startedAt: skippedAt,
        completedAt: skippedAt,
      },
    }));
  }
}

function topologicalOrder(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) throw new Error("Pinned workflow graph has an invalid edge");
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }
  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const ordered: GraphNode[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const node = byId.get(id);
    if (node) ordered.push(node);
    for (const target of outgoing.get(id) ?? []) {
      const next = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }
  if (ordered.length !== nodes.length) throw new Error("Pinned workflow graph contains a cycle");
  return ordered;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

class LostExecutionLeaseError extends Error {
  constructor() {
    super("Execution lease is no longer owned by this worker");
    this.name = "LostExecutionLeaseError";
  }
}
