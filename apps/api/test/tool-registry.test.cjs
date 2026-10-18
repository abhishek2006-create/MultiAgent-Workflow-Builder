const test = require("node:test");
const assert = require("node:assert/strict");
const { executeBuiltInTool } = require("../dist/src/executions/tool-registry.js");

test("text tool transforms a selected upstream value", () => {
  assert.deepEqual(
    executeBuiltInTool("text", { toolOperation: "uppercase", inputPath: "research.message" }, { research: { message: "hello" } }),
    { value: "HELLO" },
  );
});

test("text replace uses literal strings instead of regular expressions", () => {
  assert.deepEqual(
    executeBuiltInTool("text", { toolOperation: "replace", inputPath: "input", searchText: ".", replaceText: "!" }, { input: "a.b" }),
    { value: "a!b" },
  );
});

test("JSON utility parses and reads nested fields", () => {
  const parsed = executeBuiltInTool("json", { toolOperation: "parse", inputPath: "input.payload" }, { input: { payload: "{\"user\":{\"email\":\"a@example.com\"}}" } });
  assert.deepEqual(parsed, { user: { email: "a@example.com" } });
  assert.deepEqual(executeBuiltInTool("json", { toolOperation: "get", fieldPath: "user.email" }, parsed), { value: "a@example.com" });
});

test("JSON field reads block prototype paths", () => {
  assert.deepEqual(executeBuiltInTool("json", { toolOperation: "get", fieldPath: "__proto__.constructor" }, {}), { value: null });
});

test("date utilities normalize UTC and calculate calendar offsets", () => {
  assert.deepEqual(
    executeBuiltInTool("date", { toolOperation: "addDays", inputPath: "input.date", days: 1 }, { input: { date: "2026-01-01T00:00:00.000Z" } }),
    { value: "2026-01-02T00:00:00.000Z" },
  );
  assert.deepEqual(
    executeBuiltInTool("date", { toolOperation: "differenceDays", inputPath: "input.start", endDatePath: "input.end" }, { input: { start: "2026-01-01", end: "2026-01-04" } }),
    { value: 3 },
  );
});

test("tools reject malformed input and oversized values", () => {
  assert.throws(() => executeBuiltInTool("json", { toolOperation: "parse" }, "{"), /malformed/);
  assert.throws(() => executeBuiltInTool("text", { toolOperation: "uppercase" }, { input: 10 }), /string/);
});
