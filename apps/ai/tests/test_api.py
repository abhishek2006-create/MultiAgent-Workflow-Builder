import os
import unittest
from unittest.mock import patch

os.environ["AI_SERVICE_SECRET"] = "test-only-shared-service-secret"
os.environ.pop("GEMINI_API_KEY", None)

from fastapi.testclient import TestClient

from app.main import app


class AIServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_chat_requires_internal_service_secret(self) -> None:
        response = self.client.post("/ai/chat", json={"customer_message": "hello"})
        self.assertEqual(response.status_code, 401)

    def test_chat_rejects_invalid_request(self) -> None:
        response = self.client.post(
            "/ai/chat",
            headers={"X-AI-Service-Secret": "test-only-shared-service-secret"},
            json={"customer_message": "", "agent_type": "untrusted"},
        )
        self.assertEqual(response.status_code, 422)

    def test_chat_reports_missing_gemini_configuration(self) -> None:
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            response = self.client.post(
                "/ai/chat",
                headers={"X-AI-Service-Secret": "test-only-shared-service-secret"},
                json={"customer_message": "hello"},
            )
        self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
