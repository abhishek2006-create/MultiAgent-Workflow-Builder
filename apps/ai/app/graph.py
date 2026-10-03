import asyncio
import os
from typing import TypedDict

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.exceptions import OutputParserException
from langchain_ollama import ChatOllama
from pydantic import ValidationError
from langgraph.graph import END, START, StateGraph

from app.schemas import ChatResponse


class ChatState(TypedDict, total=False):
    customer_message: str
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
