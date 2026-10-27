from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_message: str = Field(min_length=1, max_length=8000)
    conversation_id: str | None = Field(default=None, max_length=128)
    agent_type: Literal["support", "planner", "research", "coding", "reviewer"] = "support"
    instructions: str | None = Field(default=None, max_length=4000)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    temperature: float = Field(default=0.0, ge=0.0, le=1.0)
    thinking_level: Literal["low", "medium", "high"] | None = None
    max_output_tokens: int = Field(default=1024, ge=64, le=4096)
    timeout_ms: int | None = Field(default=None, ge=1000, le=60000)


class AgentContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=4000)
    intent: str = Field(min_length=1, max_length=80)
    needs_human: bool
    plan: list[str] = Field(default_factory=list, max_length=20)
    success_criteria: list[str] = Field(default_factory=list, max_length=20)
    research_findings: list[str] = Field(default_factory=list, max_length=30)
    inferences: list[str] = Field(default_factory=list, max_length=30)
    sources: list[str] = Field(default_factory=list, max_length=20)
    review_passed: bool | None = None
    issues: list[str] = Field(default_factory=list, max_length=30)
    code_proposal: str | None = Field(default=None, max_length=16000)


class UsageMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    inputTokens: int = Field(ge=0)
    outputTokens: int = Field(ge=0)
    totalTokens: int = Field(ge=0)


class ChatResponse(AgentContent):
    usage: UsageMetadata | None = None
    searchSources: list[dict[str, str]] = Field(default_factory=list, max_length=10)
    searchQueries: list[str] = Field(default_factory=list, max_length=20)
    searchSuggestionsHtml: str | None = Field(default=None, max_length=64000)


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=1, max_length=2000)
    max_results: int = Field(default=5, ge=1, le=10)
    timeout_ms: int = Field(default=60000, ge=1000, le=60000)
