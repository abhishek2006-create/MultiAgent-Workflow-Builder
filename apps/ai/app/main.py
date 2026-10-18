import os
import hmac
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
)
from app.schemas import ChatRequest, ChatResponse

# Load local AI settings regardless of the process working directory. Values
# already supplied by Docker or the shell remain authoritative.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

app = FastAPI(title="Retail Support AI", version="0.1.0")


@app.get("/ai/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai"}


@app.post("/ai/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    service_secret: str | None = Header(default=None, alias="X-AI-Service-Secret"),
) -> ChatResponse:
    configured_secret = os.getenv("AI_SERVICE_SECRET", "").strip()
    supplied_secret = service_secret or ""
    if not configured_secret or not hmac.compare_digest(supplied_secret, configured_secret):
        raise HTTPException(status_code=401, detail="AI service authentication failed")
    try:
        result = await chat_graph.ainvoke(request.model_dump())
        return ChatResponse.model_validate(result)
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("AI_PORT", "8000")))
