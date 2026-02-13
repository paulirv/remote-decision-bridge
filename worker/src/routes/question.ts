import { Hono } from 'hono';
import type { Env, QuestionPayload, StoredQuestion } from '../types.js';
import { sendQuestion } from '../lib/telegram.js';
import { authMiddleware } from '../lib/auth.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

/** POST /question — MCP server sends a question, Worker stores it and forwards to Telegram. */
app.post('/', async (c) => {
  const body = await c.req.json<QuestionPayload>();

  if (!body.text || !body.options?.length || !body.sessionId) {
    return c.json({ error: 'Missing required fields: text, options, sessionId' }, 400);
  }

  const id = crypto.randomUUID();
  const ttl = body.timeout ?? 600;

  const question: StoredQuestion = {
    id,
    text: body.text,
    options: body.options,
    sessionId: body.sessionId,
    createdAt: new Date().toISOString(),
  };

  // Store question in KV (expires after timeout + buffer)
  await c.env.QUESTIONS.put(`q:${id}`, JSON.stringify(question), {
    expirationTtl: ttl + 60,
  });

  // Send to Telegram
  const messageId = await sendQuestion(c.env, id, body.text, body.options, body.sessionId);

  if (messageId) {
    question.telegramMessageId = messageId;
    await c.env.QUESTIONS.put(`q:${id}`, JSON.stringify(question), {
      expirationTtl: ttl + 60,
    });
  }

  return c.json({ questionId: id }, 201);
});

export { app as questionRoutes };
