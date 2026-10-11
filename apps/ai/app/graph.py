import asyncio
import json
import os
from typing import TypedDict

import httpx
from pydantic import ValidationError
from langgraph.graph import END, START, StateGraph

from app.schemas import ChatResponse


class ChatState(TypedDict, total=False):
    customer_message: str
    agent_type: str
    instructions: str | None
    message: str
    intent: str
    needs_human: bool


class AIConfigurationError(Exception):
    pass


class AIProviderTimeout(Exception):
    pass


class AIProviderError(Exception):
    pass


class AIInvalidOutput(Exception):
    pass


async def support_agent(state: ChatState) -> ChatState:
    provider = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if provider != "gemini":
        raise AIConfigurationError("AI_PROVIDER must be gemini; unsupported providers are disabled")
    if not api_key:
        raise AIConfigurationError("Set GEMINI_API_KEY before calling the AI service")
    if not model_name:
        raise AIConfigurationError("Set GEMINI_MODEL before calling the AI service")

    prompt = (
        f"You are a {state.get('agent_type', 'support')} agent in a multi-agent workflow. "
        "Be concise, accurate, and return the result needed by the next connected node. "
        "Do not claim you used tools that are not available. If the task needs a human, "
        "set needs_human=true. Follow these workflow instructions when provided: "
        f"{state.get('instructions') or 'Use the supplied input and do not invent facts.'} "
        "Return only JSON with "
        "message (string), intent (string), and needs_human (boolean).\n\n"
        f"Customer message:\n{state['customer_message']}"
    )

    client = None
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=20_000))
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=512,
                response_mime_type="application/json",
                response_schema=ChatResponse,
            ),
        )
        if not response.text:
            raise AIInvalidOutput("Gemini returned an empty response")
        parsed = json.loads(response.text)
    except (asyncio.TimeoutError, httpx.TimeoutException) as error:
        raise AIProviderTimeout from error
    except (ValidationError, json.JSONDecodeError) as error:
        raise AIInvalidOutput from error
    except AIInvalidOutput:
        raise
    except Exception as error:
        raise AIProviderError from error
    finally:
        if client is not None:
            await client.aio.aclose()

    try:
        result = parsed if isinstance(parsed, ChatResponse) else ChatResponse.model_validate(parsed)
    except ValidationError as error:
        raise AIInvalidOutput from error
    return result.model_dump()


def build_graph():
    graph = StateGraph(ChatState)
    graph.add_node("support_agent", support_agent)
    graph.add_edge(START, "support_agent")
    graph.add_edge("support_agent", END)
    return graph.compile()


chat_graph = build_graph()
