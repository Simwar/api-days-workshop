import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const GH_API = 'https://api.github.com';

async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export const pushToGitHub = createTool({
  id: 'push_to_github',
  description: 'Creates or updates a Markdown documentation file in the GitHub repository via a new branch and pull request.',
  inputSchema: z.object({
    file_path: z.string().describe('File path relative to the docs base (e.g. "authentication.md" or "api-reference/pagination.md")'),
    content: z.string().describe('Full Markdown content to write to the file'),
    commit_message: z.string().describe('Git commit message'),
    pr_title: z.string().describe('Pull request title'),
    pr_body: z.string().describe('Pull request description summarising what was changed and why'),
  }),
  outputSchema: z.object({
    pr_url: z.string().optional(),
    pushed: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ file_path, content, commit_message, pr_title, pr_body }) => {
    try {
      const repo = process.env.GITHUB_REPO;
      const docsBase = (process.env.GITHUB_DOCS_PATH ?? 'docs').replace(/\/$/, '');
      if (!repo) return { pushed: false, error: 'GITHUB_REPO is not configured' };

      const fullPath = file_path.startsWith(docsBase)
        ? file_path
        : `${docsBase}/${file_path}`;

      // Resolve default branch and its tip SHA
      const repoData = await gh(`/repos/${repo}`);
      const defaultBranch = repoData.default_branch as string;
      const refData = await gh(`/repos/${repo}/git/ref/heads/${defaultBranch}`);
      const baseSha = (refData.object as Record<string, string>).sha;

      // Create a uniquely named branch
      const branch = `docs/auto-${Date.now()}`;
      await gh(`/repos/${repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
      });

      // Check whether the file already exists (need its SHA to update it)
      let existingSha: string | undefined;
      try {
        const existing = await gh(`/repos/${repo}/contents/${fullPath}?ref=${branch}`);
        existingSha = existing.sha as string;
      } catch {
        // File does not exist yet — create it
      }

      const contentBase64 = Buffer.from(content).toString('base64');
      await gh(`/repos/${repo}/contents/${fullPath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: commit_message,
          content: contentBase64,
          branch,
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      });

      // Open a pull request
      const pr = await gh(`/repos/${repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify({
          title: pr_title,
          body: pr_body,
          head: branch,
          base: defaultBranch,
        }),
      });

      return { pr_url: pr.html_url as string, pushed: true };
    } catch (e: unknown) {
      return { pushed: false, error: (e as Error).message };
    }
  },
});
