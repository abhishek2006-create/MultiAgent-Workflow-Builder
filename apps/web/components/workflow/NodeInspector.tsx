"use client";

import type { Node } from "@xyflow/react";
import type { WorkflowNodeData } from "../../types/workflow";

interface NodeInspectorProps {
  node: (Omit<Node, "data"> & { data: WorkflowNodeData }) | null;
  onUpdate: (updates: Partial<WorkflowNodeData>) => void;
}

export default function NodeInspector({
  node,
  onUpdate,
}: NodeInspectorProps) {
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

      {node.type === "tool" && (
        <div className="mb-5 space-y-4 border-t border-white/10 pt-4">
          <h4 className="font-mono text-[10px] tracking-[0.16em] text-cyan-400">
            {data.toolKind?.toUpperCase() ?? "TOOL"} SETTINGS
          </h4>

          {data.toolKind === "http" && (
            <>
              <div>
                <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-method">
                  Method
                </label>
                <select
                  id="tool-method"
                  value={data.method ?? "GET"}
                  onChange={(event) =>
                    onUpdate({
                      method: event.target.value === "POST" ? "POST" : "GET",
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-endpoint">
                  Request URL
                </label>
                <input
                  id="tool-endpoint"
                  type="url"
                  value={data.endpoint ?? ""}
                  onChange={(event) => onUpdate({ endpoint: event.target.value })}
                  placeholder="https://api.example.com"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {data.toolKind === "search" && (
            <>
              <div>
                <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-search-query">
                  Search query
                </label>
                <input
                  id="tool-search-query"
                  value={data.searchQuery ?? ""}
                  onChange={(event) => onUpdate({ searchQuery: event.target.value })}
                  placeholder="What should this search for?"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-max-results">
                  Maximum results
                </label>
                <input
                  id="tool-max-results"
                  type="number"
                  min={1}
                  max={50}
                  value={data.maxResults ?? 5}
                  onChange={(event) =>
                    onUpdate({ maxResults: Math.min(50, Math.max(1, Number(event.target.value))) })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </>
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

          {data.toolKind === "database" && (
            <>
              <div>
                <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-database-table">
                  Table / collection
                </label>
                <input
                  id="tool-database-table"
                  value={data.databaseTable ?? ""}
                  onChange={(event) => onUpdate({ databaseTable: event.target.value })}
                  placeholder="customers"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-database-query">
                  Query
                </label>
                <textarea
                  id="tool-database-query"
                  rows={4}
                  value={data.databaseQuery ?? ""}
                  onChange={(event) => onUpdate({ databaseQuery: event.target.value })}
                  placeholder="SELECT * FROM customers"
                  className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {data.toolKind === "code" && (
            <>
              <div>
                <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-language">
                  Language
                </label>
                <select
                  id="tool-language"
                  value={data.language ?? "JavaScript"}
                  onChange={(event) => onUpdate({ language: event.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                >
                  <option>JavaScript</option>
                  <option>Python</option>
                  <option>TypeScript</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs text-slate-400" htmlFor="tool-code">
                  Code
                </label>
                <textarea
                  id="tool-code"
                  rows={6}
                  value={data.code ?? ""}
                  onChange={(event) => onUpdate({ code: event.target.value })}
                  placeholder="// Add the code to execute"
                  className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
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
              value={data.model ?? "Gemini"}
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
              <option>Gemini</option>
              <option>GPT</option>
              <option>Claude</option>
            </select>
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

          {/* Temperature */}
          <div className="mb-5">
            <div className="mb-2 flex justify-between">
              <label className="text-xs text-slate-400">
                Temperature
              </label>

              <span className="font-mono text-xs text-cyan-400">
                {data.temperature ?? 0.7}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={data.temperature ?? 0.7}
              onChange={(e) =>
                onUpdate({
                  temperature: Number(e.target.value),
                })
              }
              className="w-full accent-blue-500"
            />
          </div>

          {/* Max iterations */}
          <div className="mb-5">
            <div className="mb-2 flex justify-between">
              <label className="text-xs text-slate-400">
                Max iterations
              </label>

              <span className="font-mono text-xs text-cyan-400">
                {data.maxIterations ?? 10}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="20"
              value={data.maxIterations ?? 10}
              onChange={(e) =>
                onUpdate({
                  maxIterations: Number(e.target.value),
                })
              }
              className="w-full accent-blue-500"
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
