import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { kvGet } from '../kv.js';

type Suggestion = { id: number; area: string; recommendation: string; priority: number; source_questions: number[] };

export const getSuggestions = createTool({
  id: 'get_suggestions',
  description: 'Retrieves documentation improvement suggestions from the shared knowledge store, ordered by priority.',
  inputSchema: z.object({
    limit: z.number().default(20).describe('Max number of suggestions to retrieve (default: 20)'),
    max_priority: z.number().int().min(1).max(5).optional().describe('Only return suggestions at this priority level or higher (e.g. 2 = return priority 1 and 2 only)'),
  }),
  outputSchema: z.object({
    suggestions: z.array(z.object({
      id: z.number(),
      area: z.string(),
      recommendation: z.string(),
      priority: z.number(),
      source_questions: z.array(z.number()),
    })),
    error: z.string().optional(),
  }),
  execute: async ({ limit, max_priority }) => {
    console.log('[get_suggestions] called, limit:', limit, 'max_priority:', max_priority ?? 'none');
    try {
      const raw = await kvGet('suggestions');
      let suggestions: Suggestion[] = raw ? JSON.parse(raw) : [];
      if (max_priority !== undefined) suggestions = suggestions.filter(s => s.priority <= max_priority);
      suggestions = suggestions.sort((a, b) => a.priority - b.priority).slice(0, limit ?? 20);
      console.log('[get_suggestions] success, count:', suggestions.length);
      return { suggestions };
    } catch (e: unknown) {
      console.error('[get_suggestions] failed:', e);
      return { suggestions: [], error: (e as Error).message };
    }
  },
});
