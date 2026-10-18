const test = require("node:test");
const assert = require("node:assert/strict");
const { readyGraphNodes } = require("../dist/src/executions/graph-scheduler.js");

const nodes = ["input", "left", "right", "join", "output"].map((id) => ({ id }));
const edges = [
  { source: "input", target: "left" },
  { source: "input", target: "right" },
  { source: "left", target: "join" },
  { source: "right", target: "join" },
  { source: "join", target: "output" },
];

test("schedules independent graph branches together", () => {
  const ready = readyGraphNodes(nodes, edges, new Set(["input"]), 4);
  assert.deepEqual(ready.map((node) => node.id), ["left", "right"]);
});

test("waits for every incoming dependency before scheduling a join", () => {
  const oneBranchDone = new Set(["input", "left"]);
  assert.deepEqual(readyGraphNodes(nodes, edges, oneBranchDone, 4), [nodes[2]]);

  const bothBranchesDone = new Set(["input", "left", "right"]);
  assert.deepEqual(readyGraphNodes(nodes, edges, bothBranchesDone, 4), [nodes[3]]);
});

test("enforces the configured concurrency ceiling", () => {
  const ready = readyGraphNodes(nodes, edges, new Set(["input"]), 1);
  assert.deepEqual(ready.map((node) => node.id), ["left"]);
});

test("rejects invalid concurrency limits", () => {
  assert.throws(() => readyGraphNodes(nodes, edges, new Set(), 0), /concurrency limit/);
  assert.throws(() => readyGraphNodes(nodes, edges, new Set(), 17), /concurrency limit/);
});
