import { Hono } from 'hono';
import type { DeliveredMessage, Env, QuestionPayload, StoredQuestion } from '../types.js';
import { sendQuestion } from '../lib/telegram.js';
import { authMiddleware } from '../lib/auth.js';
import { resolveRecipients } from '../lib/recipients.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

/** POST /question — MCP server sends a question, Worker stores it and forwards to Telegram. */
app.post('/', async (c) => {
  const body = await c.req.json<QuestionPayload>();

  if (!body.text || !body.options?.length || !body.sessionId) {
    return c.json({ error: 'Missing required fields: text, options, sessionId' }, 400);
  }

  const resolved = resolveRecipients(c.env, body.recipients);
  if (!resolved.ok) {
    return c.json({ error: resolved.error }, 400);
  }

  const id = crypto.randomUUID();
  const ttl = body.timeout ?? 600;

  const question: StoredQuestion = {
    id,
    text: body.text,
    options: body.options,
    sessionId: body.sessionId,
    project: body.project,
    createdAt: new Date().toISOString(),
  };

  // Store question in KV (expires after timeout + buffer)
  await c.env.QUESTIONS.put(`q:${id}`, JSON.stringify(question), {
    expirationTtl: ttl + 60,
  });

  // Send to Telegram — one message per recipient chat
  const messages: DeliveredMessage[] = [];
  for (const chatId of resolved.chatIds) {
    const messageId = await sendQuestion(c.env, id, body.text, body.options, body.sessionId, body.project, chatId);
    if (messageId) messages.push({ chatId, messageId });
  }

  if (messages.length) {
    question.telegramMessageId = messages[0].messageId;
    question.messages = messages;
    await c.env.QUESTIONS.put(`q:${id}`, JSON.stringify(question), {
      expirationTtl: ttl + 60,
    });
  }

  return c.json({ questionId: id }, 201);
});

export { app as questionRoutes };
