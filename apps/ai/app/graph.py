import asyncio
import json
import math
import os
import logging
from typing import TypedDict

import httpx
from pydantic import ValidationError
from langgraph.graph import END, START, StateGraph

from app.schemas import AgentContent


class ChatState(TypedDict, total=False):
    customer_message: str
    agent_type: str
    instructions: str | None
    model: str | None
    temperature: float
    thinking_level: str | None
    max_output_tokens: int
    timeout_ms: int | None
    message: str
    intent: str
    needs_human: bool
    plan: list[str]
    success_criteria: list[str]
    research_findings: list[str]
    inferences: list[str]
    sources: list[str]
    review_passed: bool | None
    issues: list[str]
    code_proposal: str | None
    usage: dict[str, int] | None


class AIConfigurationError(Exception):
    pass


class AIProviderTimeout(Exception):
    def __init__(self, provider: str):
        self.provider = provider
        super().__init__(f"{provider} request timed out")


class AIProviderError(Exception):
    def __init__(self, provider: str, status_code: int | None = None):
        self.provider = provider
        self.status_code = status_code
        super().__init__(f"{provider} provider request failed")


class AIProviderAuthenticationError(AIProviderError):
    pass


class AIProviderModelError(AIProviderError):
    pass


class AIProviderRateLimitError(AIProviderError):
    pass


class AIProviderRequestError(AIProviderError):
    pass


class AIInvalidOutput(Exception):
    pass


DEFAULT_GEMINI_MODELS = {"gemini-3.8-flash", "gemini-3.5-flash-lite"}
DEFAULT_OPENAI_MODELS = {"gpt-5.5", "gpt-6-astra"}
TRANSIENT_PROVIDER_CODES = {429, 500, 502, 503, 504}
GEMINI_AGENT_CONTENT_SCHEMA = {
    "type": "object",
    "properties": {
        "message": {"type": "string"},
        "intent": {"type": "string"},
        "needs_human": {"type": "boolean"},
        "plan": {"type": "array", "items": {"type": "string"}},
        "success_criteria": {"type": "array", "items": {"type": "string"}},
        "research_findings": {"type": "array", "items": {"type": "string"}},
        "inferences": {"type": "array", "items": {"type": "string"}},
        "sources": {"type": "array", "items": {"type": "string"}},
        "review_passed": {
            "anyOf": [{"type": "boolean"}, {"type": "null"}],
        },
        "issues": {"type": "array", "items": {"type": "string"}},
        "code_proposal": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
        },
    },
    "required": [
        "message",
        "intent",
        "needs_human",
        "plan",
        "success_criteria",
        "research_findings",
        "inferences",
        "sources",
        "review_passed",
        "issues",
        "code_proposal",
    ],
    "additionalProperties": False,
}
OPENAI_AGENT_CONTENT_SCHEMA = {
    "type": "object",
    "properties": {
        "message": {"type": "string"},
        "intent": {"type": "string"},
        "needs_human": {"type": "boolean"},
        "plan": {"type": "array", "items": {"type": "string"}},
        "success_criteria": {"type": "array", "items": {"type": "string"}},
        "research_findings": {"type": "array", "items": {"type": "string"}},
        "inferences": {"type": "array", "items": {"type": "string"}},
        "sources": {"type": "array", "items": {"type": "string"}},
        "review_passed": {"anyOf": [{"type": "boolean"}, {"type": "null"}]},
        "issues": {"type": "array", "items": {"type": "string"}},
        "code_proposal": {"anyOf": [{"type": "string"}, {"type": "null"}]},
    },
    "required": [
        "message",
        "intent",
        "needs_human",
        "plan",
        "success_criteria",
        "research_findings",
        "inferences",
        "sources",
        "review_passed",
        "issues",
        "code_proposal",
    ],
    "additionalProperties": False,
}


def provider_configuration() -> dict:
    providers = []
    for name, prefix, defaults in [
        ("Gemini", "GEMINI", DEFAULT_GEMINI_MODELS),
        ("OpenAI", "OPENAI", DEFAULT_OPENAI_MODELS),
    ]:
        configured_model = os.getenv(f"{prefix}_MODEL", "").strip()
        configured_allowlist = os.getenv(f"{prefix}_ALLOWED_MODELS", "").strip()
        models = sorted({value.strip() for value in configured_allowlist.split(",") if value.strip()}
                        if configured_allowlist else defaults | ({configured_model} if configured_model else set()))
        providers.append({"name": name, "configured": bool(os.getenv(f"{prefix}_API_KEY", "").strip()), "models": models})
    default_model = (os.getenv("AI_DEFAULT_MODEL") or os.getenv("GEMINI_MODEL")
                     or os.getenv("OPENAI_MODEL") or "gemini-3.5-flash-lite").strip()
    return {"defaultModel": default_model, "providers": providers, "nodeTimeoutMs": 60000, "maxOutputTokens": 4096}


async def support_agent(state: ChatState) -> ChatState:
    # Bound the complete node, including SDK retries and structured-output repair.
    # HTTP read timeouts alone restart for each request and can leave a node hung.
    timeout_ms = state.get("timeout_ms") or _bounded_int_env(
        "AI_PROVIDER_TIMEOUT_MS", default=60_000, minimum=1_000, maximum=60_000,
    )
    if type(timeout_ms) is not int or not 1_000 <= timeout_ms <= 60_000:
        raise AIConfigurationError("timeout_ms must be between 1000 and 60000")
    provider = _provider_for_model(state.get("model") or provider_configuration()["defaultModel"])
    try:
        async with asyncio.timeout(timeout_ms / 1000):
            return await _support_agent(state)
    except TimeoutError as error:
        raise AIProviderTimeout(provider) from error


async def _support_agent(state: ChatState) -> ChatState:
    configured_default = (
        os.getenv("AI_DEFAULT_MODEL")
        or os.getenv("GEMINI_MODEL")
        or os.getenv("OPENAI_MODEL")
        or "gemini-3.5-flash-lite"
    ).strip()
    model_name = (state.get("model") or configured_default).strip()
    provider = _provider_for_model(model_name)
    key_name = "GEMINI_API_KEY" if provider == "Gemini" else "OPENAI_API_KEY"
    api_key = os.getenv(key_name, "").strip()
    if not api_key:
        model_family = "Gemini" if provider == "Gemini" else "GPT"
        raise AIConfigurationError(f"Set {key_name} before selecting a {model_family} model")

    allowed_env = "GEMINI_ALLOWED_MODELS" if provider == "Gemini" else "OPENAI_ALLOWED_MODELS"
    default_allowed = DEFAULT_GEMINI_MODELS if provider == "Gemini" else DEFAULT_OPENAI_MODELS
    configured_models = os.getenv(allowed_env, "").strip()
    allowed_models = (
        {model.strip() for model in configured_models.split(",") if model.strip()}
        if configured_models
        else default_allowed | ({os.getenv("GEMINI_MODEL" if provider == "Gemini" else "OPENAI_MODEL", "").strip()} - {""})
    )
    if not model_name or model_name not in allowed_models:
        allowed_summary = ", ".join(sorted(allowed_models)) or "none configured"
        raise AIConfigurationError(
            f'The selected {provider} model "{model_name or "(empty)"}" is not in {allowed_env}. '
            f"Allowed models: {allowed_summary}."
        )

    temperature = state.get("temperature", 0.0)
    thinking_level = state.get("thinking_level") or "low"
    max_output_tokens = state.get("max_output_tokens", 1024)
    timeout_ms = state.get("timeout_ms") or _bounded_int_env(
        "AI_PROVIDER_TIMEOUT_MS", default=60_000, minimum=1_000, maximum=60_000,
    )
    if not isinstance(temperature, (int, float)) or not math.isfinite(temperature) or not 0 <= temperature <= 1:
        raise AIConfigurationError("Temperature must be between 0 and 1")
    if not isinstance(max_output_tokens, int) or not 64 <= max_output_tokens <= 4096:
        raise AIConfigurationError("max_output_tokens must be between 64 and 4096")
    if thinking_level not in {None, "low", "medium", "high"}:
        raise AIConfigurationError("thinking_level must be low, medium, or high")
    if type(timeout_ms) is not int or not 1_000 <= timeout_ms <= 60_000:
        raise AIConfigurationError("timeout_ms must be between 1000 and 60000")

    agent_type = state.get("agent_type", "support")
    role_guidance = {
        "support": "Answer the request clearly and accurately.",
        "planner": "Return an ordered plan and measurable success criteria. The saved workflow graph, not your plan, controls execution.",
        "research": "Analyze only the supplied input. This service has no web search tool. Do not claim external research or invent citations; return source references only when they are included in the supplied input.",
        "coding": "Return a code proposal when useful. Do not execute code or claim that generated code was run or tested.",
        "reviewer": "Review the supplied result against its request. Set review_passed and list concrete issues. Do not claim tests were run unless the input contains evidence that they ran.",
    }
    if agent_type not in role_guidance:
        raise AIConfigurationError("Unsupported agent type")

    instructions = (
        f"You are a {agent_type} agent in a multi-agent workflow. {role_guidance[agent_type]} "
        "Be concise and accurate. Follow the workflow instructions when provided. "
        "Return structured JSON fields message, intent, needs_human, plan, success_criteria, "
        "research_findings, inferences, sources, review_passed, issues, and code_proposal. Use empty arrays "
        "for inapplicable lists and null for an inapplicable review_passed or code_proposal. "
        "Set needs_human=true when a decision or missing information requires human input.\n\n"
        f"Workflow instructions:\n{state.get('instructions') or 'Use the supplied input and do not invent facts.'}"
    )
    customer_message = state["customer_message"]

    result: AgentContent | None = None
    usage: dict[str, int] | None = None
    for output_attempt in range(2):
        attempt_instructions = instructions
        if output_attempt:
            attempt_instructions += (
                "\n\nThe previous response could not be parsed or validated. Regenerate it as compact JSON "
                "that follows the required schema exactly. Keep each list to at most 5 concise items, "
                "keep unused lists empty, and keep the message brief."
            )
        try:
            if provider == "Gemini":
                raw_text, call_usage = await _generate_gemini(
                    prompt=f"{attempt_instructions}\n\nSupplied input:\n{customer_message}",
                    model_name=model_name,
                    temperature=float(temperature),
                    thinking_level=thinking_level,
                    max_output_tokens=max_output_tokens,
                    timeout_ms=timeout_ms,
                    api_key=api_key,
                )
            else:
                raw_text, call_usage = await _generate_openai(
                    instructions=attempt_instructions,
                    customer_message=customer_message,
                    model_name=model_name,
                    max_output_tokens=max_output_tokens,
                    timeout_ms=timeout_ms,
                    api_key=api_key,
                )

            if call_usage is not None:
                usage = {key: (usage or {}).get(key, 0) + call_usage[key] for key in ("inputTokens", "outputTokens", "totalTokens")}
            parsed = json.loads(raw_text)
            result = AgentContent.model_validate(parsed)
            break
        except (AIInvalidOutput, ValidationError, json.JSONDecodeError) as error:
            if output_attempt == 1:
                raise AIInvalidOutput("The model returned invalid structured output after a concise retry") from error

    if result is None:
        raise AIInvalidOutput("The model returned invalid structured output")

    if agent_type == "research":
        supplied_context = customer_message
        if any(source not in supplied_context for source in result.sources):
            raise AIInvalidOutput("Research agent returned a source that was not present in its supplied context")

    output = result.model_dump()
    if usage is not None:
        output["usage"] = usage
    return output


async def _generate_gemini(
    *,
    prompt: str,
    model_name: str,
    temperature: float,
    thinking_level: str,
    max_output_tokens: int,
    timeout_ms: int,
    api_key: str,
) -> tuple[str, dict[str, int] | None]:
    try:
        from google import genai
        from google.genai import types
    except ImportError as error:
        raise AIConfigurationError("Install the apps/ai dependencies to use Gemini") from error

    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(
        timeout=timeout_ms, retry_options=types.HttpRetryOptions(attempts=1),
    ))
    try:
        response = None
        config_values = {
            "max_output_tokens": max_output_tokens,
            "response_mime_type": "application/json",
            # Gemini's supported JSON Schema subset excludes Pydantic's
            # validation-only minLength/maxLength constraints. Pydantic still
            # validates those bounds after generation.
            "response_json_schema": GEMINI_AGENT_CONTENT_SCHEMA,
        }
        if model_name == "gemini-3.8-flash":
            config_values["thinking_config"] = types.ThinkingConfig(thinking_level=thinking_level)
        elif model_name == "gemini-3.5-flash-lite":
            config_values["temperature"] = temperature
        for attempt in range(2):
            try:
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(**config_values),
                )
                break
            except (asyncio.TimeoutError, httpx.TimeoutException) as error:
                raise AIProviderTimeout("Gemini") from error
            except Exception as error:
                status_code = _provider_status_code(error)
                if attempt == 0 and status_code in TRANSIENT_PROVIDER_CODES:
                    await asyncio.sleep(0.35)
                    continue
                raise _classified_provider_error("Gemini", status_code) from error

        if response is None or not response.text:
            raise AIInvalidOutput("Gemini returned an empty response")
        return response.text, _usage_metadata(getattr(response, "usage_metadata", None))
    finally:
        try:
            await asyncio.wait_for(client.aio.aclose(), timeout=2)
        except Exception as error:
            logging.getLogger("flowforge.ai").warning("provider_cleanup_failed provider=Gemini type=%s", type(error).__name__)


async def _generate_openai(
    *,
    instructions: str,
    customer_message: str,
    model_name: str,
    max_output_tokens: int,
    timeout_ms: int,
    api_key: str,
) -> tuple[str, dict[str, int] | None]:
    request_body = {
        "model": model_name,
        "instructions": instructions,
        "input": customer_message,
        "max_output_tokens": max_output_tokens,
        "store": False,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "agent_content",
                "strict": True,
                "schema": OPENAI_AGENT_CONTENT_SCHEMA,
            },
        },
    }
    timeout_seconds = timeout_ms / 1000
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        for attempt in range(2):
            try:
                response = await client.post(
                    "https://api.openai.com/v1/responses",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=request_body,
                )
            except (asyncio.TimeoutError, httpx.TimeoutException) as error:
                raise AIProviderTimeout("OpenAI") from error
            except httpx.RequestError as error:
                raise AIProviderError("OpenAI") from error

            if response.status_code in TRANSIENT_PROVIDER_CODES and attempt == 0:
                await asyncio.sleep(0.35)
                continue
            if not response.is_success:
                raise _classified_provider_error("OpenAI", response.status_code)
            try:
                payload = response.json()
            except ValueError as error:
                raise AIInvalidOutput("OpenAI returned an invalid response") from error
            if isinstance(payload, dict) and payload.get("status") == "incomplete":
                details = payload.get("incomplete_details")
                reason = details.get("reason") if isinstance(details, dict) else None
                if reason in {"max_output_tokens", "max_tokens"}:
                    raise AIInvalidOutput("OpenAI reached the output token limit")
            response_text = _openai_response_text(payload)
            if not response_text:
                raise AIInvalidOutput("OpenAI returned no structured output")
            return response_text, _openai_usage_metadata(payload.get("usage"))

    raise AIProviderError("OpenAI")


def _provider_for_model(model_name: str) -> str:
    if model_name.startswith("gemini-"):
        return "Gemini"
    if model_name.startswith("gpt-"):
        return "OpenAI"
    raise AIConfigurationError("Choose a supported Gemini or GPT model in the node settings")


def _classified_provider_error(provider: str, status_code: int | None) -> AIProviderError | AIProviderTimeout:
    if status_code in {408, 504}:
        return AIProviderTimeout(provider)
    error_type: type[AIProviderError]
    if status_code in {401, 403}:
        error_type = AIProviderAuthenticationError
    elif status_code == 404:
        error_type = AIProviderModelError
    elif status_code == 429:
        error_type = AIProviderRateLimitError
    elif status_code in {400, 422}:
        error_type = AIProviderRequestError
    else:
        error_type = AIProviderError
    return error_type(provider, status_code)


def _openai_response_text(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    chunks: list[str] = []
    output = payload.get("output")
    if not isinstance(output, list):
        return None
    for item in output:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "refusal":
                raise AIInvalidOutput("OpenAI refused the requested output")
            if part.get("type") == "output_text" and isinstance(part.get("text"), str):
                chunks.append(part["text"])
    return "\n".join(chunks) if chunks else None


def _openai_usage_metadata(value: object) -> dict[str, int] | None:
    if not isinstance(value, dict):
        return None
    input_tokens = value.get("input_tokens")
    output_tokens = value.get("output_tokens")
    total_tokens = value.get("total_tokens")
    if all(type(token) is int and token >= 0 for token in (input_tokens, output_tokens, total_tokens)):
        return {"inputTokens": input_tokens, "outputTokens": output_tokens, "totalTokens": total_tokens}
    return None


def _usage_metadata(value: object) -> dict[str, int] | None:
    if value is None:
        return None

    def read(*names: str) -> int | None:
        for name in names:
            candidate = value.get(name) if isinstance(value, dict) else getattr(value, name, None)
            if type(candidate) is int and candidate >= 0:
                return candidate
        return None

    input_tokens = read("prompt_token_count", "promptTokenCount", "input_token_count", "inputTokenCount")
    output_tokens = read("candidates_token_count", "candidatesTokenCount", "output_token_count", "outputTokenCount")
    total_tokens = read("total_token_count", "totalTokenCount")
    if input_tokens is None or output_tokens is None or total_tokens is None:
        return None
    return {"inputTokens": input_tokens, "outputTokens": output_tokens, "totalTokens": total_tokens}


def _provider_status_code(error: Exception) -> int | None:
    for name in ("status_code", "code"):
        value = getattr(error, name, None)
        if isinstance(value, int) and not isinstance(value, bool):
            return value
    return None


def _bounded_int_env(name: str, *, default: int, minimum: int, maximum: int) -> int:
    raw_value = os.getenv(name, str(default)).strip()
    try:
        parsed = int(raw_value)
    except ValueError as error:
        raise AIConfigurationError(f"{name} must be an integer") from error
    if not minimum <= parsed <= maximum:
        raise AIConfigurationError(f"{name} must be between {minimum} and {maximum}")
    return parsed


def build_graph():
    graph = StateGraph(ChatState)
    graph.add_node("support_agent", support_agent)
    graph.add_edge(START, "support_agent")
    graph.add_edge("support_agent", END)
    return graph.compile()


chat_graph = build_graph()
