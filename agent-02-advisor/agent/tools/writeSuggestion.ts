import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { kvGet, kvPut } from '../kv.js';

type Suggestion = { id: number; area: string; recommendation: string; priority: number; source_questions: number[] };

function toIntArray(v: unknown): number[] {
  if (typeof v === 'number') return [v];
  if (typeof v === 'string') return v.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  if (Array.isArray(v)) return v.map(s => Number(s)).filter(n => !isNaN(n));
  return [];
}

export const writeSuggestion = createTool({
  id: 'write_suggestion',
  description: 'Writes a documentation improvement suggestion to the shared knowledge store.',
  inputSchema: z.object({
    area: z.string().describe('Documentation area affected (e.g. "Authentication", "Pagination", "Webhooks")'),
    recommendation: z.string().describe('Specific, actionable improvement — what to add, clarify, or fix'),
    priority: z.number().int().min(1).max(5).describe('Priority: 1 = critical (many devs blocked), 5 = nice-to-have'),
    source_questions: z.union([z.number(), z.string(), z.array(z.union([z.number(), z.string()]))]).describe('IDs of questions from the knowledge store that evidence this gap'),
  }),
  outputSchema: z.object({
    id: z.number().optional(),
    written: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ area, recommendation, priority, source_questions }) => {
    const ids = toIntArray(source_questions);
    console.log('[write_suggestion] called, area:', area, 'priority:', priority, 'ids:', ids);
    try {
      const raw = await kvGet('suggestions');
      const suggestions: Suggestion[] = raw ? JSON.parse(raw) : [];
      const id = suggestions.length + 1;
      suggestions.push({ id, area, recommendation, priority, source_questions: ids });
      await kvPut('suggestions', JSON.stringify(suggestions));
      console.log('[write_suggestion] success, id:', id);
      return { id, written: true };
    } catch (e: unknown) {
      console.error('[write_suggestion] failed:', e);
      return { written: false, error: (e as Error).message };
    }
  },
});
