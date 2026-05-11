import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const fetchDocs = createTool({
  id: 'fetch_docs',
  description: 'Fetches documentation content from the configured docs URL.',
  inputSchema: z.object({
    path: z.string().optional().describe('Sub-path to append to the base docs URL (e.g. "authentication" or "api-reference/endpoints")'),
  }),
  outputSchema: z.object({
    content: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ path }) => {
    const baseUrl = process.env.DOCS_URL;
    console.log('[fetchDocs] called, path:', path ?? 'none', 'url set:', !!baseUrl);
    if (!baseUrl) return { content: '', error: 'DOCS_URL is not configured' };

    try {
      const isFile = /\.\w+$/.test(baseUrl.split('?')[0]);
      const url = (!isFile && path) ? `${baseUrl.replace(/\/$/, '')}/${path}` : baseUrl;
      console.log('[fetchDocs] fetching:', url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      console.log('[fetchDocs] success, content length:', text.length);
      return { content: text.slice(0, 60_000) };
    } catch (e: unknown) {
      console.error('[fetchDocs] failed:', (e as Error).message);
      return { content: '', error: (e as Error).message };
    }
  },
});
