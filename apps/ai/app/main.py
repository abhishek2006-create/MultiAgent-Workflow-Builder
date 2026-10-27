import os
import hmac
import logging
import traceback
from uuid import uuid4
from collections.abc import Awaitable
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException

from app.graph import (
    AIConfigurationError,
    AIInvalidOutput,
    AIProviderAuthenticationError,
    AIProviderModelError,
    AIProviderRateLimitError,
    AIProviderRequestError,
    AIProviderError,
    AIProviderTimeout,
    chat_graph,
    provider_configuration,
)
from app.schemas import ChatRequest, ChatResponse, SearchRequest
from app.search import web_search

# Load local AI settings regardless of the process working directory. Values
# already supplied by Docker or the shell remain authoritative.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

app = FastAPI(title="Retail Support AI", version="0.1.0")
logger = logging.getLogger("flowforge.ai")


def require_service_secret(service_secret: str | None) -> None:
    configured = os.getenv("AI_SERVICE_SECRET", "").strip()
    if not configured or not hmac.compare_digest(service_secret or "", configured):
        raise HTTPException(status_code=401, detail="AI service authentication failed")


@app.get("/ai/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai"}


@app.get("/ai/configuration")
def configuration(service_secret: str | None = Header(default=None, alias="X-AI-Service-Secret")) -> dict:
    require_service_secret(service_secret)
    return provider_configuration()


@app.post("/ai/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    service_secret: str | None = Header(default=None, alias="X-AI-Service-Secret"),
) -> ChatResponse:
    require_service_secret(service_secret)
    return await _respond(chat_graph.ainvoke(request.model_dump()))


@app.post("/ai/search", response_model=ChatResponse)
async def search(request: SearchRequest, service_secret: str | None = Header(default=None, alias="X-AI-Service-Secret")) -> ChatResponse:
    require_service_secret(service_secret)
    return await _respond(web_search(request))


async def _respond(operation: Awaitable[dict]) -> ChatResponse:
    try:
        result = await operation
        # LangGraph returns merged input and output state. Only response fields
        # belong on the wire; extra input fields otherwise fail strict validation.
        return ChatResponse.model_validate({key: result[key] for key in ChatResponse.model_fields if key in result})
    except AIConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except AIProviderTimeout as error:
        raise HTTPException(status_code=504, detail=f"{error.provider} request timed out") from error
    except AIProviderAuthenticationError as error:
        key_name = "GEMINI_API_KEY" if error.provider == "Gemini" else "OPENAI_API_KEY"
        raise HTTPException(
            status_code=503,
            detail=f"{error.provider} rejected the configured API key or denied access to this model. Verify {key_name} and model access.",
        ) from error
    except AIProviderModelError as error:
        allowed_models = "GEMINI_ALLOWED_MODELS" if error.provider == "Gemini" else "OPENAI_ALLOWED_MODELS"
        raise HTTPException(
            status_code=503,
            detail=f"{error.provider} model is unavailable to this key. Check the selected model and {allowed_models}.",
        ) from error
    except AIProviderRateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail=f"{error.provider} quota or rate limit was reached. Check the provider quota and retry later.",
        ) from error
    except AIProviderRequestError as error:
        raise HTTPException(
            status_code=422,
            detail=f"{error.provider} rejected the request. Check the selected model and generation settings.",
        ) from error
    except AIInvalidOutput as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except AIProviderError as error:
        suffix = f" (provider HTTP {error.status_code})" if error.status_code is not None else ""
        raise HTTPException(
            status_code=502,
            detail=f"{error.provider} provider request failed{suffix}. Check provider availability and the AI service logs.",
        ) from error
    except Exception as error:
        reference = uuid4().hex[:12]
        # Provider exception strings can include request URLs and credentials.
        # Record locations and exception types without request bodies or raw errors.
        frames = [f"{frame.name}:{frame.lineno}" for frame in traceback.extract_tb(error.__traceback__)]
        logger.error("ai_internal_error reference=%s type=%s frames=%s", reference, type(error).__name__, frames)
        raise HTTPException(
            status_code=500,
            detail=f"AI service internal error (reference {reference}). Check the AI service terminal for this reference.",
        ) from None


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("AI_PORT", "8000")))
