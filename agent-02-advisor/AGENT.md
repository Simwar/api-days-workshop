# doc-advisor

Analyses accumulated developer questions to identify documentation gaps, repeated confusion, and missing coverage. Writes prioritised, actionable improvement suggestions to the shared database for the writer agent to act on.

## Role in the pipeline

```
questions table (written by doc-responder)
        ↓
  [doc-advisor]
        ↓
suggestions table (read by doc-writer)
```

## Inputs

| Name | Secret | Description |
|------|--------|-------------|
| `DATABASE_URL` | No | PostgreSQL connection string (no password). |
| `DB_PASSWORD` | Yes | Password for the database user — kept separate so it stays secret |

## Tools

### `get_questions`
Fetches questions from the `questions` table. Accepts:
- `limit` — number of questions to fetch (default 200)
- `since` — optional ISO 8601 datetime to filter to recent questions only

Returns questions ordered by most recent first.

### `write_suggestion`
Inserts a documentation improvement suggestion into the `suggestions` table. Fields:
- `area` — documentation section affected (e.g. `"Authentication"`, `"Pagination"`)
- `recommendation` — specific, actionable description of what to add or fix (not vague)
- `priority` — 1 (critical, many developers blocked) to 5 (nice-to-have)
- `source_questions` — IDs of questions that evidence this gap

## Database

Reads from `questions`, writes to `suggestions`:

```sql
questions(id bigserial, query text, answer text, answered boolean, timestamp timestamptz)
suggestions(id bigserial, area text, recommendation text, priority int, source_questions int[])
```

Requires the schema to be applied before first run — see `db/schema.sql` in the workshop root.

## How to trigger

Send any message asking the agent to run an analysis, e.g.:

> "Analyse the last 200 questions and write improvement suggestions."

The agent will:
1. Fetch the full question log
2. Cluster by topic — flagging repeated questions, "I don't know" answers, and wrong mental models
3. Write one `suggestion` per distinct gap with IDs linking back to source questions
4. Return a summary: questions analysed, suggestions written, top 3 priorities

## Notes

- Suggestions must be specific. "Improve authentication docs" is rejected in favour of "Add a step-by-step OAuth2 flow example with token refresh including the 401 retry cycle."
- The `source_questions` array is stored as a native PostgreSQL `int4[]` column. The tool accepts a number, a comma-separated string, or an array — all are normalised internally.
- DB connection uses `prepare: false` (required for Supabase Transaction Pooler) and forces IPv4 resolution at startup.
- The agent runs on Anthropic by default. To use a local model instead, Astropods provisions an Ollama container (`local_llm` provider, `qwen2.5:14b`) and injects `OLLAMA_BASE_URL` + `OLLAMA_MODEL` automatically — no extra inputs required.
