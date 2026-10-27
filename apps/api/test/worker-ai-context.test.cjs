const test = require("node:test");
const assert = require("node:assert/strict");
const { ExecutionWorkerService } = require("../dist/src/executions/execution-worker.service.js");

test("AI nodes receive original context, separate instructions, and upstream results without suggestion HTML", async () => {
  let request;
  const worker = new ExecutionWorkerService({}, { support: async (input) => { request = input; return { message: "answer", intent: "research", needs_human: false }; } });
  await worker.executeNode({ id: "research", type: "agent", data: { agentType: "research", instructions: "Analyze source evidence." } }, { search: { message: "A finding", sources: ["https://example.com"], searchSuggestionsHtml: "x".repeat(20000) } }, { request: "Original task", source_material: "Provided facts" });
  assert.equal(request.instructions, "Analyze source evidence.");
  const payload = JSON.parse(request.customer_message);
  assert.equal(payload.request.source_material, "Provided facts");
  assert.equal(payload.upstream.search.sources[0], "https://example.com");
  assert.equal(payload.upstream.search.searchSuggestionsHtml, undefined);
});

test("input mapping limits the information passed to a configured AI node", async () => {
  let request;
  const worker = new ExecutionWorkerService({}, { support: async (input) => { request = input; return { message: "ok", intent: "support", needs_human: false }; } });
  await worker.executeNode({ id: "agent", type: "agent", data: { inputPath: "input.public" } }, { input: { public: "selected", other: "excluded" } }, { private: "excluded" });
  assert.equal(JSON.parse(request.customer_message), "selected");
});

test("web search maps only a bounded query into the dedicated tool request", async () => {
  let sent;
  const worker = new ExecutionWorkerService({}, { search: async (...args) => { sent = args; return { message: "answer", sources: [] }; } });
  await worker.executeNode({ id: "search", type: "tool", data: { toolKind: "web-search", inputPath: "input.query", maxResults: 3 } }, { input: { query: "my research question" } }, {});
  assert.deepEqual(sent, ["my research question", 3]);
  await assert.rejects(worker.executeNode({ id: "search", type: "tool", data: { toolKind: "web-search" } }, { input: { query: "x".repeat(2001) } }, {}), /1–2000/);
});
