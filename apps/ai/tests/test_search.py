import os
import unittest
from types import SimpleNamespace as Item
from unittest.mock import patch

from app.graph import AIConfigurationError, AIInvalidOutput
from app.schemas import SearchRequest
from app.search import grounded_result, web_search


class SearchTests(unittest.IsolatedAsyncioTestCase):
    async def test_search_is_disabled_without_server_permission(self):
        with patch.dict(os.environ, {"WEB_SEARCH_ENABLED": "false"}):
            with self.assertRaises(AIConfigurationError):
                await web_search(SearchRequest(query="test"))

    def test_sources_are_grounded_deduplicated_bounded_and_safe(self):
        metadata = Item(grounding_chunks=[Item(web=Item(uri="javascript:alert(1)", title="unsafe")), Item(web=Item(uri="https://example.com/a", title="Source A")), Item(web=Item(uri="https://example.com/a", title="Duplicate")), Item(web=Item(uri="https://example.org/b", title="Source B"))], web_search_queries=["query"], search_entry_point=Item(rendered_content="<div>Suggestions</div>"))
        result = grounded_result(Item(text="Answer", candidates=[Item(grounding_metadata=metadata)], usage_metadata=None), 2)
        self.assertEqual(result["sources"], ["https://example.com/a", "https://example.org/b"])
        self.assertEqual(result["searchQueries"], ["query"])
        self.assertIn("Suggestions", result["searchSuggestionsHtml"])

    def test_no_sources_cannot_be_presented_as_web_research(self):
        with self.assertRaises(AIInvalidOutput):
            grounded_result(Item(text="Unverified claim", candidates=[]), 5)

    def test_query_and_result_limits_are_enforced(self):
        from pydantic import ValidationError
        for payload in [{"query": ""}, {"query": "x" * 2001}, {"query": "test", "max_results": 11}]:
            with self.assertRaises(ValidationError):
                SearchRequest.model_validate(payload)
