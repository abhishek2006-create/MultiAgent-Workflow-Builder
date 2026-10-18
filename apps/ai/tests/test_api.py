import os
import unittest
from unittest.mock import AsyncMock, patch

os.environ["AI_SERVICE_SECRET"] = "test-only-shared-service-secret"
os.environ.pop("GEMINI_API_KEY", None)

from httpx import ASGITransport, AsyncClient

from app.main import app


class AIServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async def asyncTearDown(self) -> None:
        await self.client.aclose()

    async def test_chat_requires_internal_service_secret(self) -> None:
        response = await self.client.post("/ai/chat", json={"customer_message": "hello"})
        self.assertEqual(response.status_code, 401)

    async def test_chat_rejects_invalid_request(self) -> None:
        response = await self.client.post(
            "/ai/chat",
            headers={"X-AI-Service-Secret": "test-only-shared-service-secret"},
            json={"customer_message": "", "agent_type": "untrusted"},
        )
        self.assertEqual(response.status_code, 422)

    async def test_chat_reports_missing_gemini_configuration(self) -> None:
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            response = await self.client.post(
                "/ai/chat",
                headers={"X-AI-Service-Secret": "test-only-shared-service-secret"},
                json={"customer_message": "hello"},
            )
        self.assertEqual(response.status_code, 503)

    async def test_chat_reports_missing_openai_configuration_for_gpt_model(self) -> None:
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            response = await self.client.post(
                "/ai/chat",
                headers={"X-AI-Service-Secret": "test-only-shared-service-secret"},
                json={"customer_message": "hello", "model": "gpt-5.5"},
            )
        self.assertEqual(response.status_code, 503)
        self.assertIn("OPENAI_API_KEY", response.json()["detail"])

    async def test_chat_returns_validated_usage_metadata(self) -> None:
        result = {
            "message": "A structured answer",
            "intent": "research",
            "needs_human": False,
            "usage": {"inputTokens": 12, "outputTokens": 8, "totalTokens": 20},
        }
        with patch("app.main.chat_graph.ainvoke", new_callable=AsyncMock, return_value=result):
            response = await self.client.post(
                "/ai/chat",
                headers={"X-AI-Service-Secret": "test-only-shared-service-secret"},
                json={"customer_message": "hello", "model": "gemini-3.8-flash"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["usage"], {"inputTokens": 12, "outputTokens": 8, "totalTokens": 20})


if __name__ == "__main__":
    unittest.main()
