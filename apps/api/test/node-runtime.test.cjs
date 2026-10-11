const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateExpression, evaluateCondition } = require("../dist/src/executions/node-runtime.js");

test("calculator evaluates bounded arithmetic and input values", () => {
  assert.equal(calculateExpression("(price * quantity) + tax", { input: { price: 12, quantity: 3, tax: 4 } }), 40);
});

test("calculator rejects code-like expressions and division by zero", () => {
  assert.throws(() => calculateExpression("process.exit()", {}), /missing or not numeric/);
  assert.throws(() => calculateExpression("1 / 0", {}), /divide by zero/);
});

test("condition evaluation returns a persisted true or false branch", () => {
  const result = evaluateCondition(
    { conditionPath: "input.total", conditionOperator: "greaterThan", conditionValue: "100" },
    { input: { total: 125 } },
  );
  assert.deepEqual(result, { branch: "true", matched: true });
});
