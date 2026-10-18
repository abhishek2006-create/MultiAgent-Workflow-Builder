import Ajv, { type AnySchema } from "ajv";
import { BadRequestException } from "@nestjs/common";

const ajv = new Ajv({ allErrors: true, strict: true, validateSchema: true });
const SCHEMA_KEYWORDS = new Set([
  "$schema", "title", "description", "type", "properties", "required", "additionalProperties",
  "items", "minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum",
  "exclusiveMinimum", "exclusiveMaximum", "minProperties", "maxProperties", "enum", "const",
  "allOf", "anyOf", "oneOf",
]);

export function inputSchemaDefinitionError(value: unknown): string | null {
  if (!isRecord(value)) return "Input node schema must be a JSON Schema object.";
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return "Input schema must be valid JSON.";
  }
  if (Buffer.byteLength(serialized, "utf8") > 16 * 1024) return "Input schema must be 16 KB or smaller.";
  const shapeError = checkSchemaShape(value);
  if (shapeError) return shapeError;
  try {
    ajv.compile(value as AnySchema);
    return null;
  } catch (error) {
    return error instanceof Error ? `Input schema is invalid: ${error.message}` : "Input schema is invalid.";
  }
}

export function jsonSchemaValueErrors(value: unknown, schema: unknown): string[] {
  const definitionError = inputSchemaDefinitionError(schema);
  if (definitionError) return [definitionError.replace(/Input node schema/g, "JSON schema").replace(/Input schema/g, "JSON schema")];
  const validate = ajv.compile(schema as AnySchema);
  if (validate(value)) return [];
  return (validate.errors ?? []).slice(0, 10).map((issue) =>
    `${issue.instancePath || "/"} ${issue.message ?? "is invalid"}`,
  );
}

export function validateExecutionInput(input: Record<string, unknown>, nodes: unknown[]): void {
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > 64 * 1024) {
    throw new BadRequestException("Workflow runtime input must be 64 KB or smaller.");
  }
  for (const node of nodes) {
    if (!isRecord(node) || node.type !== "input" || !isRecord(node.data) || node.data.inputSchema === undefined) continue;
    const schema = node.data.inputSchema;
    const definitionError = inputSchemaDefinitionError(schema);
    if (definitionError) throw new BadRequestException(`Input node "${String(node.id)}": ${definitionError}`);
    const validate = ajv.compile(schema as AnySchema);
    if (!validate(input)) {
      const details = (validate.errors ?? []).slice(0, 10).map((issue) => `${issue.instancePath || "/"} ${issue.message ?? "is invalid"}`);
      throw new BadRequestException({ message: `Runtime input does not match input node "${String(node.id)}" schema.`, errors: details });
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkSchemaShape(value: unknown, depth = 0, budget = { visited: 0 }): string | null {
  if (depth > 16) return "Input schema nesting is too deep.";
  budget.visited += 1;
  if (budget.visited > 1_000) return "Input schema has too many constraints.";
  if (!isRecord(value)) return null;
  for (const [key, child] of Object.entries(value)) {
    if (!SCHEMA_KEYWORDS.has(key)) return `Input schema keyword "${key}" is not supported.`;
    if (key === "properties") {
      if (!isRecord(child)) return "Input schema properties must be an object.";
      for (const propertySchema of Object.values(child)) {
        const error = checkSchemaShape(propertySchema, depth + 1, budget);
        if (error) return error;
      }
    } else if (["items", "additionalProperties"].includes(key)) {
      if (isRecord(child)) {
        const error = checkSchemaShape(child, depth + 1, budget);
        if (error) return error;
      } else if (typeof child !== "boolean") {
        return `Input schema ${key} must be a schema object or boolean.`;
      }
    } else if (["allOf", "anyOf", "oneOf"].includes(key)) {
      if (!Array.isArray(child) || child.length === 0 || child.length > 20) return `Input schema ${key} must contain 1 to 20 schemas.`;
      for (const nestedSchema of child) {
        const error = checkSchemaShape(nestedSchema, depth + 1, budget);
        if (error) return error;
      }
    }
  }
  return null;
}
