import asyncio
<<<<<<< HEAD
import json
=======
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
import os
from typing import TypedDict

import httpx
<<<<<<< HEAD
=======
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.exceptions import OutputParserException
from langchain_ollama import ChatOllama
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
from pydantic import ValidationError
from langgraph.graph import END, START, StateGraph

from app.schemas import ChatResponse


class ChatState(TypedDict, total=False):
    customer_message: str
<<<<<<< HEAD
    agent_type: str
    instructions: str | None
=======
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
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
<<<<<<< HEAD
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
=======
    model_name = os.getenv("OLLAMA_MODEL", "qwen3:4b")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    if not model_name or not base_url:
        raise AIConfigurationError(
            "Set OLLAMA_MODEL and OLLAMA_BASE_URL before calling the AI service"
        )

    model = ChatOllama(
        model=model_name,
        base_url=base_url,
        temperature=0,
        client_kwargs={"timeout": 20},
    ).with_structured_output(ChatResponse, method="json_schema")

    messages = [
        SystemMessage(
            content=(
                "You are a retail customer-support assistant. Be concise and polite. "
                "No order lookup or account tools are connected yet, so do not claim "
                "you checked an order or changed an account. Ask for information you "
                "need and set needs_human=true when a person should take over. "
                "Return an intent label and a customer-facing message."
            )
        ),
        HumanMessage(content=state["customer_message"]),
    ]

    try:
        parsed = await model.ainvoke(messages)
    except (asyncio.TimeoutError, httpx.TimeoutException) as error:
        raise AIProviderTimeout from error
    except (OutputParserException, ValidationError) as error:
        raise AIInvalidOutput from error
    except Exception as error:
        raise AIProviderError from error
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7

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
