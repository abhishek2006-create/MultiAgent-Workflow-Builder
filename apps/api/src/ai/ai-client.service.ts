import { Injectable, ServiceUnavailableException, GatewayTimeoutException, BadGatewayException, UnprocessableEntityException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SupportAgentInput {
  customer_message: string;
  conversation_id?: string;
  agent_type?: "support" | "planner" | "research" | "coding" | "reviewer";
  instructions?: string;
  model?: string;
  temperature?: number;
  thinking_level?: "low" | "medium" | "high";
  max_output_tokens?: number;
  timeout_ms?: number;
}

export interface AiConfiguration {
  available: boolean;
  message?: string;
  defaultModel: string;
  providers: Array<{ name: string; configured: boolean; models: string[] }>;
  nodeTimeoutMs: number;
  maxOutputTokens: number;
}

export interface SupportAgentOutput {
  message: string;
  intent: string;
  needs_human: boolean;
  plan?: string[];
  success_criteria?: string[];
  research_findings?: string[];
  inferences?: string[];
  sources?: string[];
  review_passed?: boolean | null;
  issues?: string[];
  code_proposal?: string | null;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

@Injectable()
export class AiClientService {
  constructor(private readonly config: ConfigService) {}

  async configuration(): Promise<AiConfiguration> {
    const baseUrl = this.config.get<string>("AI_SERVICE_URL")?.replace(/\/+$/, "");
    const secret = this.config.get<string>("AI_SERVICE_SECRET");
    const unavailable = (message: string): AiConfiguration => ({ available: false, message, defaultModel: "", providers: [], nodeTimeoutMs: 60000, maxOutputTokens: 4096 });
    if (!baseUrl || !secret) return unavailable("Set AI_SERVICE_URL and AI_SERVICE_SECRET in the API environment.");
    try {
      const response = await fetch(`${baseUrl}/ai/configuration`, {
        headers: { "x-ai-service-secret": secret }, signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return unavailable(response.status === 401
        ? "AI_SERVICE_SECRET must match in the API and AI service environments."
        : "Restart the AI service to load the configuration endpoint.");
      const value = await response.json() as Omit<AiConfiguration, "available">;
      if (typeof value.defaultModel !== "string" || !Array.isArray(value.providers) ||
          !value.providers.every((provider) => typeof provider.name === "string" && typeof provider.configured === "boolean" &&
            Array.isArray(provider.models) && provider.models.every((model) => typeof model === "string"))) {
        return unavailable("The AI service returned an invalid configuration response.");
      }
      // Pick allowed fields explicitly: never relay service credentials or raw configuration.
      return { available: true, defaultModel: value.defaultModel, providers: value.providers.map(({ name, configured, models }) => ({ name, configured, models })), nodeTimeoutMs: 60000, maxOutputTokens: 4096 };
    } catch {
      return unavailable("AI service is unreachable. Start it with npm run dev:ai.");
    }
  }

  async support(input: SupportAgentInput): Promise<SupportAgentOutput> {
    return this.send(input, "chat");
  }

  async search(query: string, maxResults = 5): Promise<SupportAgentOutput> {
    return this.send({ query, max_results: maxResults, timeout_ms: 60000 }, "search");
  }

  private async send(input: SupportAgentInput | { query: string; max_results: number; timeout_ms: number }, operation: "chat" | "search"): Promise<SupportAgentOutput> {
    const baseUrl = this.config.get<string>("AI_SERVICE_URL")?.replace(/\/+$/, "");
    const secret = this.config.get<string>("AI_SERVICE_SECRET");
    if (!baseUrl || !secret) {
      const missing = [
        !baseUrl && "AI_SERVICE_URL",
        !secret && "AI_SERVICE_SECRET",
      ].filter(Boolean).join(" and ");
      throw new ServiceUnavailableException(`AI service is not configured: set ${missing}`);
    }

    // Leave the provider its full configured timeout plus a small response/serialization margin.
    const configuredTimeoutMs = this.config.get<number>("AI_REQUEST_TIMEOUT_MS", 120_000);
    const timeoutMs = Math.min(120_000, Math.max(configuredTimeoutMs, (input.timeout_ms ?? 0) + 5_000));
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/ai/${operation}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ai-service-secret": secret,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new GatewayTimeoutException("AI service request timed out");
      }
      throw new ServiceUnavailableException(
        `AI service at ${baseUrl} is unavailable. Run npm run dev:ai in another terminal, or start the complete app with npm run dev:all.`,
      );
    }
    if (!response.ok) {
      const detail = await readSafeErrorDetail(response);
      if (response.status === 401) {
        throw new ServiceUnavailableException("AI service authentication failed. Make AI_SERVICE_SECRET match in the API and AI service environments.");
      }
      if (response.status === 422) {
        throw new UnprocessableEntityException(detail ?? "AI service rejected the node settings. Review the selected model and generation settings.");
      }
      if (response.status === 429) {
        throw new ServiceUnavailableException(detail ?? "The selected AI provider quota or rate limit was reached. Check its quota and retry later.");
      }
      if (response.status === 504) throw new GatewayTimeoutException(detail ?? "The selected AI provider request timed out. Check the AI service and provider availability, then retry.");
      if (response.status === 503) {
        throw new ServiceUnavailableException(detail ?? "AI service is not ready. Check the selected provider key, model allowlist, and shared service secret.");
      }
      if (response.status === 502) {
        throw new BadGatewayException(detail ?? "The selected AI provider request failed. Check the AI service logs for the provider status code.");
      }
      if (response.status === 500) {
        throw new BadGatewayException(detail ?? "AI service internal error. Check the AI service terminal for the error reference.");
      }
      throw new BadGatewayException(`AI service returned HTTP ${response.status}. Check AI service configuration and logs.`);
    }

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      throw new BadGatewayException("AI service returned invalid JSON");
    }
    if (
      !result || typeof result !== "object" ||
      typeof (result as SupportAgentOutput).message !== "string" ||
      typeof (result as SupportAgentOutput).intent !== "string" ||
      typeof (result as SupportAgentOutput).needs_human !== "boolean"
    ) {
      throw new BadGatewayException("AI service returned an invalid response");
    }
    const output = result as Record<string, unknown>;
    if (output.usage !== undefined && output.usage !== null) {
      if (!isTokenUsage(output.usage)) {
        throw new BadGatewayException("AI service returned invalid usage metadata");
      }
    }
    return result as SupportAgentOutput;
  }
}

async function readSafeErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return undefined;
    const detail = (payload as Record<string, unknown>).detail;
    if (typeof detail !== "string" || detail.length > 300) return undefined;
    if (/^(AI service internal error \(reference [a-f0-9]{12}\)\. Check the AI service terminal for this reference\.$|Gemini |OpenAI |The model |The selected (?:Gemini|OpenAI) model|Set (?:GEMINI|OPENAI)_API_KEY|Choose a supported Gemini or GPT model|AI_PROVIDER must be|AI_PROVIDER_TIMEOUT_MS must be|Install the apps\/ai dependencies|Temperature must be|max_output_tokens must be|thinking_level must be|timeout_ms must be|Unsupported agent type)/.test(detail)) {
      return detail;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function isTokenUsage(value: unknown): value is NonNullable<SupportAgentOutput["usage"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const usage = value as Record<string, unknown>;
  return ["inputTokens", "outputTokens", "totalTokens"].every((key) =>
    typeof usage[key] === "number" && Number.isSafeInteger(usage[key]) && (usage[key] as number) >= 0,
  );
}
