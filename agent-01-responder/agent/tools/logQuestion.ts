import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { kvGet, kvPut } from '../kv.js';

type Question = { id: number; query: string; answer: string; answered: boolean; timestamp: string };

export const logQuestion = createTool({
  id: 'log_question',
  description: 'Logs a developer question and its answer to the shared knowledge store. Call this before returning every answer.',
  inputSchema: z.object({
    query: z.string().describe('The developer question exactly as asked'),
    answer: z.string().describe('The answer you are about to return'),
  }),
  outputSchema: z.object({
    id: z.number().optional(),
    logged: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ query, answer }) => {
    console.log('[log_question] called, query length:', query.length);
    try {
      const raw = await kvGet('questions');
      const questions: Question[] = raw ? JSON.parse(raw) : [];
      const id = questions.length + 1;
      questions.push({ id, query, answer, answered: true, timestamp: new Date().toISOString() });
      await kvPut('questions', JSON.stringify(questions));
      console.log('[log_question] success, id:', id);
      return { id, logged: true };
    } catch (e: unknown) {
      console.error('[log_question] failed:', e);
      return { logged: false, error: (e as Error).message };
    }
  },
});
