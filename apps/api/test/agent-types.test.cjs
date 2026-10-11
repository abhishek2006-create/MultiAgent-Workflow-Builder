const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveAgentType } = require("../dist/src/executions/agent-types.js");

test("uses a research node's role when saved data has no explicit agentType", () => {
  assert.equal(resolveAgentType("agent", { label: "Research Agent" }), "research");
});

test("uses the explicit supported role before inferring from a label", () => {
  assert.equal(resolveAgentType("agent", { agentType: "coding", label: "Research Agent" }), "coding");
});

test("keeps reviewer nodes typed as reviewers and defaults generic agents to support", () => {
  assert.equal(resolveAgentType("reviewer", {}), "reviewer");
  assert.equal(resolveAgentType("agent", { label: "Custom Agent" }), "support");
});
