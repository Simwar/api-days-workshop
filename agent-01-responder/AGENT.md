# doc-responder

Answers developer questions in real-time, grounded in a Postman collection and documentation URL. Every Q&A pair is persisted to the shared database so the advisor agent can analyse patterns later.

## Role in the pipeline

```
developer question → [doc-responder] → answer
                                     ↓
                              questions table
                                     ↓
                              [doc-advisor] (reads next)
```

## Inputs

| Name | Secret | Description |
|------|--------|-------------|
| `POSTMAN_COLLECTION_URL` | No | Public URL to a Postman Collection JSON (v2.1) |
| `DOCS_URL` | No | Base URL for documentation. Can be a raw file URL or a base path — the agent appends sub-paths as needed |
| `DATABASE_URL` | No | PostgreSQL connection string (no password). |
| `DB_PASSWORD` | Yes | Password for the database user — kept separate so it stays secret |

## Tools

### `fetch_postman_collection`
Fetches the Postman collection from `POSTMAN_COLLECTION_URL` and returns endpoint definitions. Accepts an optional `filter` keyword to narrow results to relevant endpoints.

### `fetch_docs`
Fetches documentation from `DOCS_URL`. Accepts an optional `path` sub-path that is appended to the base URL (skipped if the base URL already points directly to a file). Response is capped at 60,000 characters.

### `log_question`
Writes the original question and the agent's answer to the `questions` table. Called before every response is returned, even for "I don't know" answers so coverage gaps are captured.

## Database

Writes to the `questions` table:

```sql
questions(id bigserial, query text, answer text, answered boolean, timestamp timestamptz)
```

Requires the schema to be applied before first run — see `db/schema.sql` in the workshop root.

## Notes

- `DOCS_URL` can point to a raw file (e.g. `https://raw.githubusercontent.com/…/README.md`) or a base path. The agent detects file URLs by checking for a file extension and skips path appending in that case.
- The agent will say "I don't know" rather than hallucinate — those responses are also logged so the advisor can flag missing documentation.
- DB connection uses `prepare: false` (required for Supabase Transaction Pooler) and forces IPv4 resolution at startup.
- The agent runs on Anthropic by default. To use a local model instead, Astropods provisions an Ollama container (`local_llm` provider, `qwen2.5:14b`) and injects `OLLAMA_BASE_URL` + `OLLAMA_MODEL` automatically — no extra inputs required.
