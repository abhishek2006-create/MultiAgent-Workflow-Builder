import os

from fastapi import FastAPI, HTTPException

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
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        result = await chat_graph.ainvoke({"customer_message": request.customer_message})
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
