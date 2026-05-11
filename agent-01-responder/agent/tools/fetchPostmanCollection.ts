import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

type PostmanItem = {
  name?: string;
  request?: { method?: string; url?: { raw?: string } | string; body?: { raw?: string } };
  item?: PostmanItem[];
};

function extractEndpoints(items: PostmanItem[], folder = ''): string[] {
  const lines: string[] = [];
  for (const item of items) {
    if (item.item) {
      lines.push(...extractEndpoints(item.item, item.name ?? folder));
    } else if (item.request) {
      const method = item.request.method ?? 'GET';
      const urlRaw = typeof item.request.url === 'string'
        ? item.request.url
        : item.request.url?.raw ?? '';
      // Strip all {{variable}} placeholders — replace path params with :param style
      const path = urlRaw
        .replace(/\{\{baseUrl\}\}/g, '')
        .replace(/\{\{(\w+)\}\}/g, ':$1')
        .replace(/^\/+/, '/');
      const body = item.request.body?.raw
        ? ` — body: ${item.request.body.raw.slice(0, 200)}`
        : '';
      const prefix = folder ? `[${folder}] ` : '';
      lines.push(`${prefix}${method} ${path} (${item.name ?? ''})${body}`);
    }
  }
  return lines;
}

export const fetchPostmanCollection = createTool({
  id: 'fetch_postman_collection',
  description: 'Returns a plain-text summary of all API endpoints from the Postman collection, optionally filtered by keyword.',
  inputSchema: z.object({
    filter: z.string().optional().describe('Keyword to filter endpoints by name or path — omit to return all endpoints'),
  }),
  outputSchema: z.object({
    endpoints: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ filter }) => {
    const url = process.env.POSTMAN_COLLECTION_URL;
    console.log('[fetchPostmanCollection] called, filter:', filter ?? 'none', 'url set:', !!url);
    if (!url) return { endpoints: '', error: 'POSTMAN_COLLECTION_URL is not configured' };

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const collection = await res.json() as { item?: PostmanItem[] };

      let lines = extractEndpoints(collection?.item ?? []);

      if (filter) {
        const keyword = filter.toLowerCase();
        lines = lines.filter(l => l.toLowerCase().includes(keyword));
      }

      console.log('[fetchPostmanCollection] endpoints returned:', lines.length);
      return { endpoints: lines.join('\n') || 'No matching endpoints found.' };
    } catch (e: unknown) {
      console.error('[fetchPostmanCollection] failed:', (e as Error).message);
      return { endpoints: '', error: (e as Error).message };
    }
  },
});
