import { Hono } from 'hono';
import type { Env, StoredQuestion } from '../types.js';
import { authMiddleware } from '../lib/auth.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

/** GET /answer/:id — MCP server polls for an answer. Returns 200 with answer or 204 if pending. */
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const raw = await c.env.QUESTIONS.get(`q:${id}`);

  if (!raw) {
    return c.json({ error: 'Question not found or expired' }, 404);
  }

  const question: StoredQuestion = JSON.parse(raw);

  if (!question.answer) {
    return c.body(null, 204);
  }

  return c.json({
    questionId: id,
    answer: question.answer,
    answeredAt: question.answeredAt,
  });
});

export { app as answerRoutes };
