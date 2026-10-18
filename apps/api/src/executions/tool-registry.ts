import { calculateExpression } from "./node-runtime";

export type BuiltInToolKind = "calculator" | "text" | "json" | "date";

export function executeBuiltInTool(
  kind: BuiltInToolKind,
  config: Record<string, unknown>,
  input: unknown,
): unknown {
  switch (kind) {
    case "calculator":
      return { value: calculateExpression(String(config.expression ?? ""), input) };
    case "text":
      return executeText(config, input);
    case "json":
      return executeJson(config, input);
    case "date":
      return executeDate(config, input);
  }
}

function executeText(config: Record<string, unknown>, input: unknown): { value: string } {
  const selected = resolveInputPath(input, stringValue(config.inputPath));
  if (typeof selected !== "string") throw new Error("Text tool input must resolve to a string");
  if (selected.length > 20_000) throw new Error("Text tool input exceeds 20000 characters");
  let value: string;
  switch (config.toolOperation) {
    case "trim": value = selected.trim(); break;
    case "uppercase": value = selected.toLocaleUpperCase(); break;
    case "lowercase": value = selected.toLocaleLowerCase(); break;
    case "replace": {
      const search = stringValue(config.searchText);
      if (!search) throw new Error("Text replace requires non-empty search text");
      value = selected.split(search).join(stringValue(config.replaceText));
      break;
    }
    default: throw new Error("Text tool operation is not supported");
  }
  return { value };
}

function executeJson(config: Record<string, unknown>, input: unknown): unknown {
  const selected = resolveInputPath(input, stringValue(config.inputPath));
  switch (config.toolOperation) {
    case "parse": {
      if (typeof selected !== "string") throw new Error("JSON parse input must resolve to a string");
      if (selected.length > 100_000) throw new Error("JSON input exceeds 100000 characters");
      try { return JSON.parse(selected) as unknown; }
      catch { throw new Error("JSON input is malformed"); }
    }
    case "stringify": {
      const value = JSON.stringify(selected);
      if (value.length > 100_000) throw new Error("Serialized JSON exceeds 100000 characters");
      return { value };
    }
    case "get": {
      const fieldPath = stringValue(config.fieldPath);
      if (!fieldPath) throw new Error("JSON get requires a field path");
      return { value: resolveInputPath(selected, fieldPath) ?? null };
    }
    default: throw new Error("JSON tool operation is not supported");
  }
}

function executeDate(config: Record<string, unknown>, input: unknown): { value: string | number } {
  switch (config.toolOperation) {
    case "now": return { value: new Date().toISOString() };
    case "addDays": {
      const source = resolveInputPath(input, stringValue(config.inputPath));
      const date = parseDate(source);
      const days = Number(config.days);
      if (!Number.isFinite(days) || Math.abs(days) > 36_500) throw new Error("Date offset must be a finite number within 100 years");
      date.setUTCDate(date.getUTCDate() + days);
      return { value: date.toISOString() };
    }
    case "differenceDays": {
      const start = parseDate(resolveInputPath(input, stringValue(config.inputPath)));
      const end = parseDate(resolveInputPath(input, stringValue(config.endDatePath)));
      return { value: (end.getTime() - start.getTime()) / 86_400_000 };
    }
    default: throw new Error("Date tool operation is not supported");
  }
}

function parseDate(value: unknown): Date {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Date input must be an ISO string or timestamp");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Date input is invalid");
  return date;
}

export function resolveInputPath(value: unknown, path: string): unknown {
  if (!path) return value;
  let current = value;
  for (const part of path.split(".")) {
    if (!part || ["__proto__", "prototype", "constructor"].includes(part) || !isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
