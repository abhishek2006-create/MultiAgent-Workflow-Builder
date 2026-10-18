"use client";

import type { Node } from "@xyflow/react";
import { useEffect, useState } from "react";
import type { WorkflowNodeData } from "../../types/workflow";

interface NodeInspectorProps {
  node: (Omit<Node, "data"> & { data: WorkflowNodeData }) | null;
  onUpdate: (updates: Partial<WorkflowNodeData>) => void;
}

export default function NodeInspector({
  node,
  onUpdate,
}: NodeInspectorProps) {
  const [inputSchemaText, setInputSchemaText] = useState("");
  const [inputSchemaError, setInputSchemaError] = useState<string | null>(null);
  const [outputSchemaText, setOutputSchemaText] = useState("");
  const [outputSchemaError, setOutputSchemaError] = useState<string | null>(null);
  useEffect(() => {
    setInputSchemaText(node?.type === "input" && node.data.inputSchema
      ? JSON.stringify(node.data.inputSchema, null, 2)
      : "");
    setInputSchemaError(null);
    setOutputSchemaText(node?.data.outputSchema ? JSON.stringify(node.data.outputSchema, null, 2) : "");
    setOutputSchemaError(null);
  }, [node?.id, node?.type, node?.data.inputSchema, node?.data.outputSchema]);

  if (!node) {
    return (
      <aside className="w-[290px] shrink-0 border-l border-white/10 bg-slate-950/40 p-5">
        <h3 className="font-mono text-xs tracking-[0.2em] text-cyan-400">
          NODE CONFIGURATION
        </h3>

        <div className="mt-10 text-center text-sm text-slate-500">
          Select a node to configure it.
        </div>
      </aside>
    );
  }

  const data = node.data;
  const selectedModel = data.model ?? "gemini-3.8-flash";

  return (
    <aside className="w-[290px] shrink-0 overflow-y-auto border-l border-white/10 bg-slate-950/40 p-5">
      <h3 className="mb-5 border-b border-white/10 pb-3 font-mono text-sm tracking-[0.18em] text-cyan-400">
        {data.category === "AI AGENT"
          ? "AGENT CONFIGURATION"
          : "NODE CONFIGURATION"}
      </h3>

      {/* Name */}
      <div className="mb-4">
        <label className="mb-2 block text-xs text-slate-400">
          Node name
        </label>

        <input
          value={data.label}
          onChange={(e) =>
            onUpdate({
              label: e.target.value,
            })
          }
          className="
            w-full rounded-lg border border-white/10
            bg-black/40 px-3 py-2
            text-sm text-slate-100
            outline-none
            focus:border-blue-500
          "
        />
      </div>

      {node.type === "input" && (
        <div className="mb-5 border-t border-white/10 pt-4">
          <label className="mb-2 block text-xs text-slate-400" htmlFor="input-schema">Runtime input schema (JSON Schema)</label>
          <textarea
            id="input-schema"
            value={inputSchemaText}
            onChange={(event) => {
              const text = event.target.value;
              setInputSchemaText(text);
              if (!text.trim()) {
                onUpdate({ inputSchema: undefined });
                setInputSchemaError(null);
                return;
              }
              try {
                const parsed: unknown = JSON.parse(text);
                if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Schema must be a JSON object.");
                onUpdate({ inputSchema: parsed as Record<string, unknown> });
                setInputSchemaError(null);
              } catch (cause) {
                setInputSchemaError(cause instanceof Error ? cause.message : "Schema JSON is invalid.");
              }
            }}
            rows={8}
            spellCheck={false}
            placeholder={'{\n  "type": "object",\n  "required": ["message"],\n  "properties": { "message": { "type": "string" } }\n}'}
            className="w-full rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[10px] text-slate-100 outline-none focus:border-blue-500"
          />
          {inputSchemaError ? <p role="alert" className="mt-2 text-[10px] text-rose-300">{inputSchemaError}</p> : <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Runs are rejected when their input does not match this schema. Leave blank to accept any JSON object.</p>}
        </div>
      )}

      {node.type !== "input" && (
        <div className="mb-5 border-t border-white/10 pt-4">
          <label className="mb-2 block text-xs text-slate-400" htmlFor="output-schema">Output schema (JSON Schema)</label>
          <textarea
            id="output-schema"
            value={outputSchemaText}
            onChange={(event) => {
              const text = event.target.value;
              setOutputSchemaText(text);
              if (!text.trim()) {
                onUpdate({ outputSchema: undefined });
                setOutputSchemaError(null);
                return;
              }
              try {
                const parsed: unknown = JSON.parse(text);
                if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Schema must be a JSON object.");
                onUpdate({ outputSchema: parsed as Record<string, unknown> });
                setOutputSchemaError(null);
              } catch (cause) {
                setOutputSchemaError(cause instanceof Error ? cause.message : "Schema JSON is invalid.");
              }
            }}
            rows={6}
            spellCheck={false}
            placeholder={'{\n  "type": "object",\n  "required": ["message"],\n  "properties": { "message": { "type": "string" } }\n}'}
            className="w-full rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[10px] text-slate-100 outline-none focus:border-blue-500"
          />
          {outputSchemaError ? <p role="alert" className="mt-2 text-[10px] text-rose-300">{outputSchemaError}</p> : <p className="mt-2 text-[10px] leading-relaxed text-slate-500">The worker validates this node result before storing it. Leave blank to accept any JSON value.</p>}
        </div>
      )}

      {node.type === "tool" && (
        <div className="mb-5 space-y-4 border-t border-white/10 pt-4">
          <h4 className="font-mono text-[10px] tracking-[0.16em] text-cyan-400">
            {data.toolKind?.toUpperCase() ?? "TOOL"} SETTINGS
          </h4>
          <label className="block text-xs text-slate-400" htmlFor="tool-operation">Operation</label>
          <select
            id="tool-operation"
            value={data.toolOperation ?? defaultOperation(data.toolKind)}
            onChange={(event) => onUpdate({ toolOperation: event.target.value })}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          >
            {operationsFor(data.toolKind).map((operation) => <option key={operation.value} value={operation.value}>{operation.label}</option>)}
          </select>

          {data.toolKind !== "calculator" && data.toolKind !== "date" && (
            <div>
              <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-input-path">Input field path</label>
              <input
                id="tool-input-path"
                value={data.inputPath ?? ""}
                onChange={(event) => onUpdate({ inputPath: event.target.value })}
                placeholder="research.message or input.json"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
          )}

          {data.toolKind === "calculator" && (
            <div>
              <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-expression">
                Expression
              </label>
              <input
                id="tool-expression"
                value={data.expression ?? ""}
                onChange={(event) => onUpdate({ expression: event.target.value })}
                placeholder="(price * quantity) + tax"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
          )}

          {data.toolKind === "text" && data.toolOperation === "replace" && (
            <>
              <input aria-label="Text to find" value={data.searchText ?? ""} onChange={(event) => onUpdate({ searchText: event.target.value })} placeholder="Text to find" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100" />
              <input aria-label="Replacement text" value={data.replaceText ?? ""} onChange={(event) => onUpdate({ replaceText: event.target.value })} placeholder="Replacement text" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100" />
            </>
          )}
          {data.toolKind === "json" && data.toolOperation === "get" && (
            <input aria-label="JSON field path" value={data.fieldPath ?? ""} onChange={(event) => onUpdate({ fieldPath: event.target.value })} placeholder="customer.email" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100" />
          )}
          {data.toolKind === "date" && (
            <>
              <input aria-label="Date field path" value={data.inputPath ?? ""} onChange={(event) => onUpdate({ inputPath: event.target.value })} placeholder="input.startDate" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100" />
              {data.toolOperation === "addDays" && <input aria-label="Days to add" type="number" value={data.days ?? 0} onChange={(event) => onUpdate({ days: Number(event.target.value) })} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100" />}
              {data.toolOperation === "differenceDays" && <input aria-label="End date field path" value={data.endDatePath ?? ""} onChange={(event) => onUpdate({ endDatePath: event.target.value })} placeholder="input.endDate" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100" />}
            </>
          )}
        </div>
      )}

      {node.type === "condition" && (
        <div className="mb-5 space-y-4 border-t border-white/10 pt-4">
          <h4 className="font-mono text-[10px] tracking-[0.16em] text-orange-300">BRANCH CONDITION</h4>
          <div>
            <label className="mb-2 block text-xs text-slate-400" htmlFor="condition-path">Input field path</label>
            <input
              id="condition-path"
              value={data.conditionPath ?? "input.message"}
              onChange={(event) => onUpdate({ conditionPath: event.target.value })}
              placeholder="input.order.total"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-slate-400" htmlFor="condition-operator">Operator</label>
            <select
              id="condition-operator"
              value={data.conditionOperator ?? "exists"}
              onChange={(event) => onUpdate({ conditionOperator: event.target.value as WorkflowNodeData["conditionOperator"] })}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            >
              <option value="exists">Exists</option>
              <option value="truthy">Is truthy</option>
              <option value="equals">Equals</option>
              <option value="notEquals">Does not equal</option>
              <option value="contains">Contains</option>
              <option value="greaterThan">Greater than</option>
              <option value="lessThan">Less than</option>
            </select>
          </div>
          {!["exists", "truthy"].includes(data.conditionOperator ?? "exists") && (
            <div>
              <label className="mb-2 block text-xs text-slate-400" htmlFor="condition-value">Compare value</label>
              <input
                id="condition-value"
                value={data.conditionValue ?? ""}
                onChange={(event) => onUpdate({ conditionValue: event.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
            </div>
          )}
          <p className="text-[10px] leading-relaxed text-slate-500">Connect the green handle for true and the red handle for false.</p>
        </div>
      )}

      {/* Model */}
      {(node.type === "agent" ||
        node.type === "reviewer" ||
        node.type === "llm") && (
        <>
          <div className="mb-4">
            <label className="mb-2 block text-xs text-slate-400">
              Model
            </label>

            <select
              value={selectedModel}
              onChange={(e) =>
                onUpdate({
                  model: e.target.value,
                })
              }
              className="
                w-full rounded-lg border border-white/10
                bg-black/40 px-3 py-2
                text-sm text-slate-100
                outline-none
                focus:border-blue-500
              "
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option>
              <option value="gpt-5.5">GPT-5.5 (OpenAI)</option>
              <option value="gpt-6-astra">GPT-6 Astra (OpenAI)</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-xs text-slate-400" htmlFor="agent-input-path">Input mapping (optional)</label>
            <input
              id="agent-input-path"
              value={data.inputPath ?? ""}
              onChange={(event) => onUpdate({ inputPath: event.target.value })}
              placeholder="input.message or research.message"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          {selectedModel === "gemini-3.8-flash" ? (
            <div className="mb-5">
              <label className="mb-2 block text-xs text-slate-400" htmlFor="agent-thinking-level">Thinking level</label>
              <select
                id="agent-thinking-level"
                value={data.thinkingLevel ?? "medium"}
                onChange={(event) => onUpdate({ thinkingLevel: event.target.value as WorkflowNodeData["thinkingLevel"] })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          ) : selectedModel.startsWith("gemini-") ? (
            <div className="mb-5">
              <div className="mb-2 flex justify-between"><label className="text-xs text-slate-400" htmlFor="agent-temperature">Temperature</label><span className="font-mono text-xs text-cyan-400">{data.temperature ?? 0.7}</span></div>
              <input id="agent-temperature" type="range" min="0" max="1" step="0.1" value={data.temperature ?? 0.7} onChange={(event) => onUpdate({ temperature: Number(event.target.value) })} className="w-full accent-blue-500" />
            </div>
          ) : (
            <p className="mb-5 text-[11px] leading-relaxed text-slate-500">
              OpenAI uses its model defaults for generation settings.
            </p>
          )}

          <div className="mb-5">
            <div className="mb-2 flex justify-between">
              <label className="text-xs text-slate-400" htmlFor="agent-max-tokens">Output token limit</label>
              <span className="font-mono text-xs text-cyan-400">{data.maxTokens ?? 512}</span>
            </div>
            <input
              id="agent-max-tokens"
              type="range"
              min="64"
              max="4096"
              step="64"
              value={data.maxTokens ?? 512}
              onChange={(event) => onUpdate({ maxTokens: Number(event.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          <div className="mb-5">
            <div className="mb-2 flex justify-between">
              <label className="text-xs text-slate-400" htmlFor="agent-timeout">Node timeout</label>
              <span className="font-mono text-xs text-cyan-400">{Math.round((data.timeoutMs ?? 30000) / 1000)}s</span>
            </div>
            <input
              id="agent-timeout"
              type="range"
              min="1000"
              max="60000"
              step="1000"
              value={data.timeoutMs ?? 30000}
              onChange={(event) => onUpdate({ timeoutMs: Number(event.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-xs text-slate-400" htmlFor="agent-retries">Transient error retries</label>
            <select
              id="agent-retries"
              value={data.maxRetries ?? 0}
              onChange={(event) => onUpdate({ maxRetries: Number(event.target.value) })}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
            >
              <option value={0}>None</option>
              <option value={1}>1 retry</option>
              <option value={2}>2 retries</option>
              <option value={3}>3 retries</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Retries provider timeouts and transient AI service errors with a short bounded backoff.</p>
          </div>

          {/* Instructions */}
          <div className="mb-4">
            <label className="mb-2 block text-xs text-slate-400">
              Instructions
            </label>

            <textarea
              value={data.instructions ?? ""}
              onChange={(e) =>
                onUpdate({
                  instructions: e.target.value,
                })
              }
              rows={5}
              className="
                w-full resize-none rounded-lg border border-white/10
                bg-black/40 px-3 py-2
                font-mono text-xs text-slate-100
                outline-none
                focus:border-blue-500
              "
            />
          </div>

        </>
      )}

      {/* Streaming */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs text-slate-400">
          Streaming
        </span>

        <div className="h-5 w-9 rounded-full bg-blue-500/50 p-0.5">
          <div className="ml-auto h-4 w-4 rounded-full bg-white" />
        </div>
      </div>
    </aside>
  );
}

function operationsFor(kind: WorkflowNodeData["toolKind"]) {
  if (kind === "text") return [
    { value: "trim", label: "Trim whitespace" },
    { value: "uppercase", label: "Uppercase" },
    { value: "lowercase", label: "Lowercase" },
    { value: "replace", label: "Replace text" },
  ];
  if (kind === "json") return [
    { value: "parse", label: "Parse JSON" },
    { value: "stringify", label: "Serialize JSON" },
    { value: "get", label: "Read field" },
  ];
  if (kind === "date") return [
    { value: "now", label: "Current time (UTC)" },
    { value: "addDays", label: "Add days" },
    { value: "differenceDays", label: "Days between dates" },
  ];
  return [{ value: "calculate", label: "Calculate expression" }];
}

function defaultOperation(kind: WorkflowNodeData["toolKind"]): string {
  if (kind === "text") return "uppercase";
  if (kind === "json") return "parse";
  if (kind === "date") return "now";
  return "calculate";
}
