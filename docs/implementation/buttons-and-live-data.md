# Buttons and live data — 28 October 2026

- Save sends the current name, description, nodes and edges to the workflow API. The toolbar shows draft, saving, unsaved changes or saved. A successful save preserves the execution console and edits made while the request is pending. Concurrent saves are blocked.
- Selecting or measuring a node does not dirty a saved graph; moving or editing it does. Workflow names can be edited in the toolbar.
- Validate checks the current canvas, including unsaved definitions. Run saves pending changes first; if the canvas changes during that save, it asks for another save before running.
- Import/export use workflow JSON. History links to persisted executions. Run, approval, cancellation and retry use execution APIs; pending actions disable conflicting controls, and errors remain visible.
- Back returns to the workflow list, including when the builder was opened directly.
- Dashboard counts, success rate, activity, timing and provider token counts come from the authenticated workspace's database. It refreshes every five seconds while visible and when the window regains focus. Refresh also works manually. The server provides the update timestamp; failed refreshes mark retained data stale. Unavailable data is not displayed as a fabricated zero.
- Usage is explicitly limited to the latest ten runs. Success rate is completed / (completed + failed); cancelled and pending runs are excluded. Token usage uses provider-reported metadata; costs are not invented.

Validation: 57 API tests, 13 web tests, lint, TypeScript and production build passed. The isolated PostgreSQL HTTP integration test passed, including real persisted metrics and workspace isolation, using mocked AI. Browser checks verified rename/save version 2, validation, calculator run returning 1048, approval and automatic dashboard transition from waiting approval to completed. That browser check used no AI tokens.
