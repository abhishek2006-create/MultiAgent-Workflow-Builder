import { Injectable, ServiceUnavailableException, GatewayTimeoutException, BadGatewayException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SupportAgentInput {
  customer_message: string;
  conversation_id?: string;
  agent_type?: "support" | "planner" | "research" | "coding" | "reviewer";
  instructions?: string;
}

export interface SupportAgentOutput {
  message: string;
  intent: string;
  needs_human: boolean;
}

@Injectable()
export class AiClientService {
  constructor(private readonly config: ConfigService) {}

  async support(input: SupportAgentInput): Promise<SupportAgentOutput> {
    const baseUrl = this.config.get<string>("AI_SERVICE_URL")?.replace(/\/+$/, "");
    const secret = this.config.get<string>("AI_SERVICE_SECRET");
    if (!baseUrl || !secret) {
      const missing = [
        !baseUrl && "AI_SERVICE_URL",
        !secret && "AI_SERVICE_SECRET",
      ].filter(Boolean).join(" and ");
      throw new ServiceUnavailableException(`AI service is not configured: set ${missing}`);
    }

    const timeoutMs = this.config.get<number>("AI_REQUEST_TIMEOUT_MS", 25_000);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/ai/chat`, {
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
      throw new ServiceUnavailableException("AI service is unavailable");
    }
    if (!response.ok) {
      if (response.status === 504) throw new GatewayTimeoutException("AI provider request timed out");
      if (response.status === 503) throw new ServiceUnavailableException("AI provider is not configured");
      throw new BadGatewayException("AI service failed to process the request");
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
    return result as SupportAgentOutput;
  }
}
