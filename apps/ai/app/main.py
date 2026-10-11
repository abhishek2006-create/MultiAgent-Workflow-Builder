import os
<<<<<<< HEAD
import hmac

from fastapi import FastAPI, Header, HTTPException
=======

from fastapi import FastAPI, HTTPException
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7

from app.graph import (
    AIConfigurationError,
    AIInvalidOutput,
    AIProviderError,
    AIProviderTimeout,
    chat_graph,
)
from app.schemas import ChatRequest, ChatResponse

app = FastAPI(title="Retail Support AI", version="0.1.0")


@app.get("/ai/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai"}


@app.post("/ai/chat", response_model=ChatResponse)
<<<<<<< HEAD
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
=======
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        result = await chat_graph.ainvoke({"customer_message": request.customer_message})
>>>>>>> 38f420d14c4b93cff554976b777305f48627c1c7
        return ChatResponse.model_validate(result)
    except AIConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except AIProviderTimeout as error:
        raise HTTPException(status_code=504, detail="The model request timed out") from error
    except AIInvalidOutput as error:
        raise HTTPException(status_code=502, detail="The model returned invalid structured output") from error
    except AIProviderError as error:
        raise HTTPException(status_code=502, detail="The model provider request failed") from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("AI_PORT", "8000")))
