# doc-responder

Answers developer questions in real-time, grounded in a Postman collection and documentation URL. Every Q&A pair is persisted to the shared KV store so the advisor agent can analyse patterns later.

## Role in the pipeline

```
developer question → [doc-responder] → answer
                                     ↓
                              KV store (questions)
                                     ↓
                              [doc-advisor] (reads next)
```

## Inputs

| Name | Secret | Description |
|------|--------|-------------|
| `POSTMAN_COLLECTION_URL` | No | Public URL to a Postman Collection JSON (v2.1) |
| `DOCS_URL` | No | Base URL for documentation. Can be a raw file URL or a base path — the agent appends sub-paths as needed |
| `KV_API_URL` | No | Base URL of the kv-store agent (e.g. `https://kv-store.your-astro-domain.com`) |
| `NAMESPACE` | No | Shared namespace for this set of agents — must match across responder, advisor, and writer |

## Tools

### `fetch_postman_collection`
Fetches the Postman collection from `POSTMAN_COLLECTION_URL` and returns endpoint definitions. Accepts an optional `filter` keyword to narrow results to relevant endpoints.

### `fetch_docs`
Fetches documentation from `DOCS_URL`. Accepts an optional `path` sub-path that is appended to the base URL (skipped if the base URL already points directly to a file). Response is capped at 60,000 characters.

### `log_question`
Writes the original question and the agent's answer to the shared KV store under the `questions` key. Called before every response is returned, even for "I don't know" answers so coverage gaps are captured.

## Storage

Questions are persisted in the KV store as a JSON array under the `questions` key, namespaced by `NAMESPACE`:

```json
[{ "id": 1, "query": "...", "answer": "...", "answered": true, "timestamp": "2026-..." }]
```

The KV store is shared with the advisor agent — no schema setup required.

## Notes

- `DOCS_URL` can point to a raw file (e.g. `https://raw.githubusercontent.com/…/README.md`) or a base path. The agent detects file URLs by checking for a file extension and skips path appending in that case.
- The agent will say "I don't know" rather than hallucinate — those responses are also logged so the advisor can flag missing documentation.
