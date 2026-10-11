export type ConditionBranch = "true" | "false";

export function evaluateCondition(
  data: Record<string, unknown>,
  input: unknown,
): { branch: ConditionBranch; matched: boolean } {
  const path = typeof data.conditionPath === "string" ? data.conditionPath.trim() : "";
  const operator = typeof data.conditionOperator === "string" ? data.conditionOperator : "";
  if (!path || path.length > 200) throw new Error("Condition node requires a field path up to 200 characters");

  const actual = resolvePath(input, path);
  const expected = typeof data.conditionValue === "string" ? data.conditionValue : "";
  let matched: boolean;
  switch (operator) {
    case "exists":
      matched = actual !== undefined && actual !== null;
      break;
    case "truthy":
      matched = Boolean(actual);
      break;
    case "equals":
      matched = String(actual ?? "") === expected;
      break;
    case "notEquals":
      matched = String(actual ?? "") !== expected;
      break;
    case "contains":
      matched = typeof actual === "string"
        ? actual.includes(expected)
        : Array.isArray(actual) && actual.some((value) => String(value) === expected);
      break;
    case "greaterThan":
    case "lessThan": {
      const left = Number(actual);
      const right = Number(expected);
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        throw new Error(`Condition ${operator} requires finite numeric values`);
      }
      matched = operator === "greaterThan" ? left > right : left < right;
      break;
    }
    default:
      throw new Error(`Condition operator "${operator}" is not supported`);
  }
  return { branch: matched ? "true" : "false", matched };
}

export function calculateExpression(expression: string, input: unknown): number {
  if (!expression.trim() || expression.length > 500) {
    throw new Error("Calculator expression must contain 1–500 characters");
  }
  const values = flattenRecords(input);
  const tokens = tokenize(expression.trim());
  let index = 0;

  const factor = (): number => {
    const token = tokens[index++];
    if (token === "+") return factor();
    if (token === "-") return -factor();
    if (token === "(") {
      const value = sum();
      if (tokens[index++] !== ")") throw new Error("Calculator expression has an unmatched parenthesis");
      return value;
    }
    if (token === undefined) throw new Error("Calculator expression ended unexpectedly");
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);
    if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(token)) {
      const value = resolvePath(values, token);
      const numeric = typeof value === "number" ? value : Number(value);
      if (value === undefined || value === null || !Number.isFinite(numeric)) {
        throw new Error(`Calculator value "${token}" is missing or not numeric`);
      }
      return numeric;
    }
    throw new Error(`Unexpected token "${token}" in calculator expression`);
  };

  const product = (): number => {
    let value = factor();
    while (["*", "/", "%"].includes(tokens[index] ?? "")) {
      const operator = tokens[index++];
      const right = factor();
      if ((operator === "/" || operator === "%") && right === 0) {
        throw new Error("Calculator expression cannot divide by zero");
      }
      value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
    }
    return value;
  };

  const sum = (): number => {
    let value = product();
    while (["+", "-"].includes(tokens[index] ?? "")) {
      const operator = tokens[index++];
      const right = product();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const result = sum();
  if (index !== tokens.length) throw new Error(`Unexpected token "${tokens[index]}" in calculator expression`);
  if (!Number.isFinite(result)) throw new Error("Calculator result is not finite");
  return result;
}

function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  const tokenPattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_][A-Za-z0-9_.]*)|([()+\-*/%]))/y;
  let offset = 0;
  while (offset < expression.length) {
    tokenPattern.lastIndex = offset;
    const match = tokenPattern.exec(expression);
    if (!match) throw new Error(`Invalid calculator expression near "${expression.slice(offset, offset + 16)}"`);
    tokens.push(match[1] ?? match[2] ?? match[3]);
    offset = tokenPattern.lastIndex;
  }
  return tokens;
}

function flattenRecords(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const flattened: Record<string, unknown> = {};
  for (const nested of Object.values(value)) {
    if (isRecord(nested)) Object.assign(flattened, nested);
  }
  return { ...flattened, ...value };
}

function resolvePath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const part of path.split(".")) {
    if (!part || !isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
