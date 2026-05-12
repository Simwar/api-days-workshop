# doc-advisor

Analyses accumulated developer questions to identify documentation gaps, repeated confusion, and missing coverage. Writes prioritised, actionable improvement suggestions to the shared KV store for the writer agent to act on.

## Role in the pipeline

```
KV store (questions, written by doc-responder)
        ↓
  [doc-advisor]
        ↓
KV store (suggestions, read by doc-writer)
```

## Inputs

| Name | Secret | Description |
|------|--------|-------------|
| `KV_API_URL` | No | Base URL of the kv-store agent (e.g. `https://kv-store.your-astro-domain.com`) |
| `NAMESPACE` | No | Shared namespace for this set of agents — must match across responder, advisor, and writer |

## Tools

### `get_questions`
Fetches questions from the shared KV store. Accepts:
- `limit` — number of questions to fetch (default 200)
- `since` — optional ISO 8601 datetime to filter to recent questions only

Returns questions ordered by most recent first.

### `write_suggestion`
Inserts a documentation improvement suggestion into the shared KV store. Fields:
- `area` — documentation section affected (e.g. `"Authentication"`, `"Pagination"`)
- `recommendation` — specific, actionable description of what to add or fix (not vague)
- `priority` — 1 (critical, many developers blocked) to 5 (nice-to-have)
- `source_questions` — IDs of questions that evidence this gap

## Storage

Reads from the `questions` key, writes to the `suggestions` key in the KV store, both namespaced by `NAMESPACE`:

```json
// questions
[{ "id": 1, "query": "...", "answer": "...", "answered": true, "timestamp": "2026-..." }]

// suggestions
[{ "id": 1, "area": "...", "recommendation": "...", "priority": 1, "source_questions": [1, 2] }]
```

The KV store is shared with the responder and writer agents — no schema setup required.

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
- The `source_questions` field accepts a number, a comma-separated string, or an array — all are normalised internally.
