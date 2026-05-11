import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { kvGet } from '../kv.js';

type Question = { id: number; query: string; answer: string; answered: boolean; timestamp: string };

export const getQuestions = createTool({
  id: 'get_questions',
  description: 'Retrieves questions from the shared knowledge store for pattern analysis.',
  inputSchema: z.object({
    limit: z.number().default(200).describe('Max number of questions to retrieve (default: 200)'),
    since: z.string().optional().describe('ISO 8601 datetime — only fetch questions logged after this time'),
  }),
  outputSchema: z.object({
    questions: z.array(z.object({
      id: z.number(),
      query: z.string(),
      answer: z.string(),
      answered: z.boolean(),
      timestamp: z.string(),
    })),
    total: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ limit, since }) => {
    console.log('[get_questions] called, limit:', limit, 'since:', since ?? 'none');
    try {
      const raw = await kvGet('questions');
      let questions: Question[] = raw ? JSON.parse(raw) : [];
      if (since) questions = questions.filter(q => q.timestamp > since);
      questions = questions.slice(0, limit ?? 200);
      console.log('[get_questions] success, count:', questions.length);
      return { questions, total: questions.length };
    } catch (e: unknown) {
      console.error('[get_questions] failed:', e);
      return { questions: [], total: 0, error: (e as Error).message };
    }
  },
});
