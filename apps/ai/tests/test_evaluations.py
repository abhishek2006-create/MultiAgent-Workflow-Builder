import json
import os
import time
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from app.graph import support_agent


CASES_PATH = Path(__file__).resolve().parents[3] / "eval" / "agents" / "mock-cases.json"


class MockAgentEvaluationTests(unittest.IsolatedAsyncioTestCase):
    async def test_agent_role_cases_have_valid_structured_outputs(self) -> None:
        cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(cases), 4)

        for case in cases:
            with self.subTest(case=case["name"]):
                content = json.dumps(case["mock_response"])
                env = {
                    "AI_PROVIDER": "gemini",
                    "GEMINI_API_KEY": "mock-only-key",
                    "GEMINI_MODEL": "gemini-3.8-flash",
                    "GEMINI_ALLOWED_MODELS": "gemini-3.8-flash",
                }
                started = time.perf_counter()
                with patch.dict(os.environ, env), patch(
                    "app.graph._generate_gemini",
                    new_callable=AsyncMock,
                    return_value=(content, {"inputTokens": 10, "outputTokens": 8, "totalTokens": 18}),
                ) as generate:
                    result = await support_agent({
                        "customer_message": case["customer_message"],
                        "agent_type": case["agent_type"],
                        "model": "gemini-3.8-flash",
                    })
                elapsed = time.perf_counter() - started

                self.assertEqual(result["intent"], case["expected_intent"])
                self.assertTrue(result[case["required_field"]])
                self.assertEqual(result["usage"]["totalTokens"], 18)
                self.assertLess(elapsed, 1.0, "mock evaluation should complete without provider latency")
                self.assertIn("Supplied input:", generate.call_args.kwargs["prompt"])


if __name__ == "__main__":
    unittest.main()
