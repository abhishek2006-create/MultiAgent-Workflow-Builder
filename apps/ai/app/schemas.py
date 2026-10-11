from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_message: str = Field(min_length=1, max_length=8000)
    conversation_id: str | None = Field(default=None, max_length=128)
    agent_type: Literal["support", "planner", "research", "coding", "reviewer"] = "support"
    instructions: str | None = Field(default=None, max_length=4000)


class ChatResponse(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    intent: str = Field(min_length=1, max_length=80)
    needs_human: bool
