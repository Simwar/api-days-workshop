---
description: Turns prioritised documentation suggestions into Markdown files and opens pull requests on GitHub. Each suggestion becomes its own independently reviewable PR.
tags: [documentation, github, pull-requests, writing, api]
authors:
  - name: Simon Guerrier
    account: simwar
capabilities:
  - Draft Markdown documentation files from improvement suggestions stored in a KV store
  - Open a dedicated GitHub pull request for each documentation change
repository: github:Simwar/api-days-workshop/tree/master/agent-03-writer
integrations: [anthropic, github]
---

# doc-writer

Turns prioritised documentation suggestions into actual Markdown files and opens pull requests on GitHub. Each suggestion becomes its own PR so it can be reviewed independently.

## Role in the pipeline

```
KV store (suggestions, written by doc-advisor)
          ↓
    [doc-writer]
          ↓
  GitHub pull requests
```

## Inputs

| Name | Secret | Description |
|------|--------|-------------|
| `GITHUB_REPO` | No | Target repository in `owner/repo` format (e.g. `acme/api-docs`) |
| `GITHUB_DOCS_PATH` | No | Base directory for documentation files within the repo (default: `docs`) |
| `KV_API_URL` | No | Base URL of the kv-store agent (e.g. `https://kv-store.your-astro-domain.com`) |
| `NAMESPACE` | No | Shared namespace for this set of agents — must match across responder, advisor, and writer |

The GitHub integration provides a `GITHUB_TOKEN` at runtime — no manual token input required.

## Tools

### `get_suggestions`
Fetches suggestions from the shared KV store. Accepts:
- `limit` — number of suggestions to fetch (default 20)
- `max_priority` — upper bound on priority level; `2` returns only priority 1 and 2 (most critical)

Returns suggestions ordered by priority ascending (most critical first).

### `push_to_github`
Creates a branch, writes a Markdown file, and opens a pull request. Accepts:
- `file_path` — path relative to `GITHUB_DOCS_PATH` (e.g. `authentication.md`)
- `content` — full Markdown content for the file
- `commit_message` — commit message for the file write
- `pr_title` — pull request title
- `pr_body` — pull request description

The tool resolves the default branch, creates a uniquely named branch (`docs/auto-{timestamp}`), creates or updates the file, and opens the PR.

## Storage

Reads from the `suggestions` key in the KV store, namespaced by `NAMESPACE`:

```json
[{ "id": 1, "area": "...", "recommendation": "...", "priority": 1, "source_questions": [1, 2] }]
```

The KV store is shared with the responder and advisor agents — no schema setup required.

## How to trigger

Send any message asking the agent to process suggestions, e.g.:

> "Process the most critical suggestions and open PRs."

The agent will:
1. Fetch suggestions at `max_priority: 2` (priority 1 and 2 only) by default
2. For each suggestion in priority order, draft Markdown and open a PR
3. Report which files were written and which PRs were opened

## File naming convention

The agent derives the file path from the suggestion's `area` field:

| Area | File |
|------|------|
| `Authentication` | `authentication.md` |
| `Pagination` | `pagination.md` |
| `Webhooks` | `webhooks.md` |

The `GITHUB_DOCS_PATH` prefix is prepended automatically if not already present.

## Notes

- Each suggestion produces exactly one PR so reviewers can approve or reject changes independently.
- Markdown follows these conventions: lead with the happy path, then edge cases; include working code examples for API interactions; use `##` for sections and `###` for sub-sections; keep prose concise.
