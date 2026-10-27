const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(relative, imports = {}) {
  const filename = path.resolve(__dirname, "..", relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => imports[name] ?? require(name), process, Headers, fetch: (...args) => global.fetch(...args), console }, { filename });
  return exports;
}
const urls = load("lib/api-url.ts");
const { api, ApiError } = load("lib/api.ts", { "./api-url": urls });
const { exampleRuntimeInput } = load("lib/workflow/runtimeInput.ts");
const { executionEdges } = load("lib/workflow/executionEdges.ts");
const { useWorkflowStore } = load("stores/workflowStore.ts", {
  "../lib/workflow/defaultWorkflow": { defaultWorkflowNodes: [], defaultWorkflowEdges: [] },
});

function savedWorkflow(version = 1) {
  return { id: "saved-a", name: "Original", description: "", status: "DRAFT", version,
    nodes: [{ id: "input", type: "input", position: { x: 0, y: 0 }, data: { label: "Input" } }], edges: [] };
}

test("save acknowledgement preserves newer edits, selection, and execution data", () => {
  useWorkflowStore.getState().hydrate(savedWorkflow());
  useWorkflowStore.getState().selectNode("input");
  useWorkflowStore.getState().setExecution("run-a", "RUNNING");
  const snapshot = useWorkflowStore.getState();
  useWorkflowStore.getState().setWorkflowMetadata({ name: "Edited during save" });
  useWorkflowStore.getState().acceptSaved(savedWorkflow(2), snapshot);
  const result = useWorkflowStore.getState();
  assert.equal(result.name, "Edited during save");
  assert.equal(result.isDirty, true);
  assert.equal(result.version, 2);
  assert.equal(result.selectedNodeId, "input");
  assert.equal(result.executionId, "run-a");
  assert.equal(result.executionStatus, "RUNNING");
  result.acceptSaved({ ...savedWorkflow(3), name: result.name }, result);
  assert.equal(useWorkflowStore.getState().isDirty, false);
});

test("selecting and measuring nodes does not mark a saved graph dirty, moving it does", () => {
  useWorkflowStore.getState().hydrate(savedWorkflow());
  useWorkflowStore.getState().onNodesChange([{ id: "input", type: "select", selected: true }]);
  useWorkflowStore.getState().onNodesChange([{ id: "input", type: "dimensions", dimensions: { width: 100, height: 80 } }]);
  assert.equal(useWorkflowStore.getState().isDirty, false);
  useWorkflowStore.getState().onNodesChange([{ id: "input", type: "position", position: { x: 50, y: 0 } }]);
  assert.equal(useWorkflowStore.getState().isDirty, true);
});

test("save action persists the current canvas once and retains edits made while awaiting the API", async () => {
  useWorkflowStore.getState().hydrate(savedWorkflow());
  let finish;
  let calls = 0;
  const { useWorkflowApi } = load("hooks/useWorkflowApi.ts", {
    react: { useCallback: (callback) => callback },
    "../stores/workflowStore": { useWorkflowStore: Object.assign((selector) => selector(useWorkflowStore.getState()), { getState: useWorkflowStore.getState }) },
    "../lib/api": { api: { workflows: { update: async (id, payload) => {
      calls += 1;
      assert.equal(id, "saved-a");
      assert.equal(payload.name, "Before request");
      assert.equal(payload.nodes[0].data.label, "Configured input");
      return new Promise((resolve) => { finish = () => resolve({ ...savedWorkflow(2), ...payload }); });
    } } } },
  });
  useWorkflowStore.getState().setWorkflowMetadata({ name: "Before request" });
  useWorkflowStore.getState().updateNode("input", { label: "Configured input" });
  const actions = useWorkflowApi();
  const pending = actions.saveWorkflow();
  await assert.rejects(actions.saveWorkflow(), /already in progress/);
  useWorkflowStore.getState().setWorkflowMetadata({ name: "After request" });
  finish();
  await pending;
  assert.equal(calls, 1);
  assert.equal(useWorkflowStore.getState().name, "After request");
  assert.equal(useWorkflowStore.getState().isDirty, true);
  assert.equal(useWorkflowStore.getState().isSaving, false);
});

test("every connection has a directional arrow before execution", () => {
  const [edge] = executionEdges([{ id: "a-b", source: "a", target: "b", type: "smoothstep" }]);
  assert.equal(edge.type, "workflow");
  assert.equal(edge.markerEnd.type, "arrowclosed");
  assert.equal(edge.animated, false);
});

test("both parallel running branches show flow from the completed upstream node", () => {
  const edges = executionEdges([{ id: "a-b", source: "a", target: "b" }, { id: "a-c", source: "a", target: "c" }], [{ nodeId: "a", status: "COMPLETED" }, { nodeId: "b", status: "RUNNING" }, { nodeId: "c", status: "RUNNING" }]);
  assert(edges.every((edge) => edge.animated));
});

test("inactive conditional connections do not animate into a running join", () => {
  const [edge] = executionEdges([{ id: "condition-join", source: "condition", target: "join", sourceHandle: "true" }], [{ nodeId: "condition", status: "COMPLETED", output: { branch: "false" } }, { nodeId: "join", status: "RUNNING" }]);
  assert.equal(edge.animated, false);
  assert.equal(edge.style.opacity, 0.35);
});

test("approval pauses and failed nodes stop flow while completed runs can replay their path", () => {
  const connection = [{ id: "a-b", source: "a", target: "b" }];
  assert.equal(executionEdges(connection, [{ nodeId: "a", status: "COMPLETED" }, { nodeId: "b", status: "WAITING_APPROVAL" }])[0].animated, false);
  const failed = executionEdges(connection, [{ nodeId: "a", status: "COMPLETED" }, { nodeId: "b", status: "FAILED" }])[0];
  assert.equal(failed.animated, false);
  assert.equal(failed.markerEnd.color, "#fb7185");
  const completed = [{ nodeId: "a", status: "COMPLETED" }, { nodeId: "b", status: "COMPLETED" }];
  assert.equal(executionEdges(connection, completed, "b")[0].animated, true);
  assert.equal(completed[1].status, "COMPLETED");
});

test("starter JSON input matches the chosen search or parsing template", () => {
  assert.equal(typeof exampleRuntimeInput([{ type: "tool", data: { toolKind: "web-search", inputPath: "input.query" } }]).query, "string");
  const parsed = exampleRuntimeInput([{ type: "tool", data: { toolKind: "json", toolOperation: "parse", inputPath: "input.json" } }]);
  assert.equal(JSON.parse(parsed.json).total, 42);
});

test("configured Input schema examples take precedence over generic starter input", () => {
  const input = exampleRuntimeInput([{ type: "input", data: { inputSchema: { examples: [{ custom: "value" }] } } }]);
  assert.equal(input.custom, "value");
});

test("normalizes API prefixes for relative and direct requests", () => {
  const original = process.env.NEXT_PUBLIC_API_URL;
  try {
    for (const [value, expected] of [["", "/api"], ["/api/", "/api"], ["http://localhost:3001/", "http://localhost:3001/api"], ["http://localhost:3001/api", "http://localhost:3001/api"]]) {
      process.env.NEXT_PUBLIC_API_URL = value;
      assert.equal(urls.getApiBaseUrl(), expected);
    }
  } finally { if (original === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL = original; }
});

test("sends cookies and uncached runtime input when starting an execution", async () => {
  const original = global.fetch;
  global.fetch = async (url, options) => {
    assert.match(url, /\/workflows\/test\/run$/);
    assert.equal(options.credentials, "include");
    assert.equal(options.cache, "no-store");
    assert.equal(options.method, "POST");
    assert.equal(JSON.parse(options.body).input.message, "hello");
    return new Response(JSON.stringify({ executionId: "run-1", status: "QUEUED" }), { headers: { "content-type": "application/json" } });
  };
  try { assert.equal((await api.workflows.run("test", { input: { message: "hello" } })).status, "QUEUED"); }
  finally { global.fetch = original; }
});

test("shows backend validation errors with the correct HTTP status", async () => {
  const original = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ message: ["input is invalid", "query is required"] }), { status: 400, headers: { "content-type": "application/json" } });
  try { await assert.rejects(api.ai.configuration(), (error) => error instanceof ApiError && error.status === 400 && error.message.includes("query is required")); }
  finally { global.fetch = original; }
});

test("network failures remain failures instead of fabricated workflow success", async () => {
  const original = global.fetch;
  global.fetch = async () => { throw new Error("offline"); };
  try { await assert.rejects(api.ai.configuration(), (error) => error instanceof ApiError && error.status === 0); }
  finally { global.fetch = original; }
});
