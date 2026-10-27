import os
import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.graph import (
    AIConfigurationError,
    AIProviderTimeout,
    provider_configuration,
    _generate_openai,
    _openai_response_text,
    _openai_usage_metadata,
    _provider_for_model,
    _provider_status_code,
    _usage_metadata,
    support_agent,
)
from app.schemas import AgentContent, ChatRequest


class AgentContractTests(unittest.IsolatedAsyncioTestCase):
    async def test_node_deadline_covers_all_provider_attempts(self) -> None:
        async def slow_provider(**kwargs):
            await asyncio.sleep(10)
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-only", "GEMINI_ALLOWED_MODELS": "gemini-3.8-flash"}), patch("app.graph._generate_gemini", slow_provider):
            started = asyncio.get_running_loop().time()
            with self.assertRaises(AIProviderTimeout):
                await support_agent({"customer_message": "hello", "model": "gemini-3.8-flash", "timeout_ms": 1000})
            self.assertLess(asyncio.get_running_loop().time() - started, 2)

    def test_configuration_exposes_flags_and_models_without_keys(self) -> None:
        with patch.dict(os.environ, {"OPENAI_API_KEY": "secret-not-for-client", "OPENAI_MODEL": "gpt-configured", "OPENAI_ALLOWED_MODELS": ""}):
            configuration = provider_configuration()
        self.assertNotIn("secret-not-for-client", str(configuration))
        provider = next(value for value in configuration["providers"] if value["name"] == "OpenAI")
        self.assertTrue(provider["configured"])
        self.assertIn("gpt-configured", provider["models"])

    async def test_agent_uses_configured_model_and_role_guidance(self) -> None:
        content = AgentContent(
            message="Findings from supplied context",
            intent="research",
            needs_human=False,
            research_findings=["A documented fact"],
        ).model_dump_json()
        mocked_generate = AsyncMock(return_value=(content, {
            "inputTokens": 10,
            "outputTokens": 5,
            "totalTokens": 15,
        }))
        env = {
            "AI_PROVIDER": "gemini",
            "GEMINI_API_KEY": "test-only-key",
            "GEMINI_MODEL": "gemini-3.8-flash",
            "GEMINI_ALLOWED_MODELS": "gemini-3.8-flash",
        }
        with patch.dict(os.environ, env), patch("app.graph._generate_gemini", mocked_generate):
            result = await support_agent({
                "customer_message": "Use this supplied context",
                "agent_type": "research",
                "model": "gemini-3.8-flash",
                "temperature": 0.2,
                "max_output_tokens": 256,
                "timeout_ms": 12000,
            })

        self.assertEqual(result["research_findings"], ["A documented fact"])
        self.assertEqual(result["usage"]["totalTokens"], 15)
        prompt = mocked_generate.call_args.kwargs["prompt"].lower()
        self.assertIn("no web search tool", prompt)
        self.assertEqual(mocked_generate.call_args.kwargs["temperature"], 0.2)
        self.assertEqual(mocked_generate.call_args.kwargs["max_output_tokens"], 256)
        self.assertEqual(mocked_generate.call_args.kwargs["timeout_ms"], 12000)

    async def test_agent_retries_invalid_structured_output_with_compact_instructions(self) -> None:
        content = AgentContent(
            message="A concise plan",
            intent="planning",
            needs_human=False,
            plan=["Complete the requested task"],
            success_criteria=["The task is complete"],
        ).model_dump_json()
        mocked_generate = AsyncMock(side_effect=[("{not json", {"inputTokens": 10, "outputTokens": 2, "totalTokens": 12}), (content, {"inputTokens": 11, "outputTokens": 8, "totalTokens": 19})])
        env = {
            "GEMINI_API_KEY": "test-only-key",
            "GEMINI_ALLOWED_MODELS": "gemini-3.8-flash",
        }
        with patch.dict(os.environ, env), patch("app.graph._generate_gemini", mocked_generate):
            result = await support_agent({
                "customer_message": "Plan this task",
                "agent_type": "planner",
                "model": "gemini-3.8-flash",
            })

        self.assertEqual(result["message"], "A concise plan")
        self.assertEqual(result["usage"], {"inputTokens": 21, "outputTokens": 10, "totalTokens": 31})
        self.assertEqual(mocked_generate.await_count, 2)
        retry_prompt = mocked_generate.call_args_list[1].kwargs["prompt"].lower()
        self.assertIn("regenerate it as compact json", retry_prompt)

    async def test_agent_routes_selected_gpt_model_to_openai(self) -> None:
        content = AgentContent(message="OpenAI response", intent="support", needs_human=False).model_dump_json()
        mocked_generate = AsyncMock(return_value=(content, None))
        env = {
            "OPENAI_API_KEY": "test-only-openai-key",
            "OPENAI_ALLOWED_MODELS": "gpt-5.5",
        }
        with patch.dict(os.environ, env), patch("app.graph._generate_openai", mocked_generate):
            result = await support_agent({
                "customer_message": "hello",
                "agent_type": "support",
                "model": "gpt-5.5",
                "max_output_tokens": 128,
            })

        self.assertEqual(result["message"], "OpenAI response")
        self.assertEqual(mocked_generate.call_args.kwargs["model_name"], "gpt-5.5")
        self.assertEqual(mocked_generate.call_args.kwargs["api_key"], "test-only-openai-key")
        self.assertEqual(mocked_generate.call_args.kwargs["max_output_tokens"], 128)

    async def test_agent_requires_the_key_for_the_selected_provider(self) -> None:
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}), self.assertRaises(AIConfigurationError):
            await support_agent({"customer_message": "hello", "model": "gpt-5.5"})

    async def test_agent_rejects_models_outside_server_allowlist(self) -> None:
        env = {
            "AI_PROVIDER": "gemini",
            "GEMINI_API_KEY": "test-only-key",
            "GEMINI_MODEL": "gemini-3.8-flash",
            "GEMINI_ALLOWED_MODELS": "gemini-3.8-flash",
        }
        with patch.dict(os.environ, env), self.assertRaises(AIConfigurationError):
            await support_agent({"customer_message": "hello", "model": "gemini-2.5-pro"})

    async def test_agent_rejects_invalid_generation_limits(self) -> None:
        env = {"AI_PROVIDER": "gemini", "GEMINI_API_KEY": "test-only-key"}
        with patch.dict(os.environ, env), self.assertRaises(AIConfigurationError):
            await support_agent({"customer_message": "hello", "max_output_tokens": 9000})


class ProviderMetadataTests(unittest.TestCase):
    def test_model_prefix_selects_provider(self) -> None:
        self.assertEqual(_provider_for_model("gpt-5.5"), "OpenAI")
        self.assertEqual(_provider_for_model("gemini-3.8-flash"), "Gemini")

    def test_openai_response_and_usage_are_parsed(self) -> None:
        payload = {
            "output": [{"content": [{"type": "output_text", "text": "{\"ok\":true}"}]}],
            "usage": {"input_tokens": 7, "output_tokens": 3, "total_tokens": 10},
        }
        self.assertEqual(_openai_response_text(payload), '{"ok":true}')
        self.assertEqual(_openai_usage_metadata(payload["usage"]), {
            "inputTokens": 7,
            "outputTokens": 3,
            "totalTokens": 10,
        })

    def test_usage_metadata_maps_provider_fields(self) -> None:
        metadata = SimpleNamespace(prompt_token_count=20, candidates_token_count=7, total_token_count=27)
        self.assertEqual(_usage_metadata(metadata), {
            "inputTokens": 20,
            "outputTokens": 7,
            "totalTokens": 27,
        })

    def test_partial_usage_is_not_fabricated(self) -> None:
        self.assertIsNone(_usage_metadata({"promptTokenCount": 20}))

    def test_provider_status_code_is_extracted_without_exposing_error_text(self) -> None:
        error = RuntimeError("private provider response")
        error.status_code = 403
        self.assertEqual(_provider_status_code(error), 403)
        self.assertIsNone(_provider_status_code(RuntimeError("no status")))


class RequestLimitsTests(unittest.TestCase):
    def test_model_and_generation_settings_are_bounded(self) -> None:
        valid = ChatRequest(customer_message="hello", model="gemini-3.8-flash", temperature=0.5, max_output_tokens=1024)
        self.assertEqual(valid.max_output_tokens, 1024)
        with self.assertRaises(ValueError):
            ChatRequest(customer_message="hello", temperature=2)
        with self.assertRaises(ValueError):
            ChatRequest(customer_message="hello", max_output_tokens=10_000)
        with self.assertRaises(ValueError):
            ChatRequest(customer_message="hello", timeout_ms=60_001)


if __name__ == "__main__":
    unittest.main()
