from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    customer_message: str = Field(min_length=1, max_length=8000)
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    intent: str = Field(min_length=1, max_length=80)
    needs_human: bool
