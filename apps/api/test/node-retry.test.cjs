const test = require("node:test");
const assert = require("node:assert/strict");
const { configuredNodeRetries, isRetryableNodeError, nodeRetryDelayMs } = require("../dist/src/executions/node-retry.js");

test("bounds configured per-node retries and defaults to zero", () => {
  assert.equal(configuredNodeRetries(undefined), 0);
  assert.equal(configuredNodeRetries({ maxRetries: 2 }), 2);
  assert.equal(configuredNodeRetries({ maxRetries: 4 }), 0);
  assert.equal(configuredNodeRetries({ maxRetries: 1.5 }), 0);
});

test("only retries transient errors on AI nodes", () => {
  const timeout = { getStatus: () => 504 };
  const unavailable = { getStatus: () => 503, message: "AI service is unavailable" };
  const misconfigured = { getStatus: () => 503, message: "AI service is not configured" };
  assert.equal(isRetryableNodeError(timeout, "agent"), true);
  assert.equal(isRetryableNodeError(unavailable, "llm"), true);
  assert.equal(isRetryableNodeError(misconfigured, "agent"), false);
  assert.equal(isRetryableNodeError(timeout, "tool"), false);
  assert.equal(isRetryableNodeError(new Error("bad input"), "reviewer"), false);
});

test("uses capped exponential retry backoff", () => {
  assert.equal(nodeRetryDelayMs(0), 250);
  assert.equal(nodeRetryDelayMs(1), 500);
  assert.equal(nodeRetryDelayMs(2), 1_000);
  assert.equal(nodeRetryDelayMs(3), 2_000);
  assert.throws(() => nodeRetryDelayMs(4), /between 0 and 3/);
});
