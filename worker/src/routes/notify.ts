import { Hono } from 'hono';
import type { Env, NotifyPayload } from '../types.js';
import { sendNotification } from '../lib/telegram.js';
import { authMiddleware } from '../lib/auth.js';
import { resolveRecipients } from '../lib/recipients.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

/** POST /notify — Fire-and-forget status notification to Telegram. */
app.post('/', async (c) => {
  const body = await c.req.json<NotifyPayload>();

  if (!body.text || !body.sessionId) {
    return c.json({ error: 'Missing required fields: text, sessionId' }, 400);
  }

  const resolved = resolveRecipients(c.env, body.recipients);
  if (!resolved.ok) {
    return c.json({ error: resolved.error }, 400);
  }

  for (const chatId of resolved.chatIds) {
    await sendNotification(c.env, body.text, body.sessionId, body.severity, body.project, chatId);
  }
  return c.json({ ok: true });
});

export { app as notifyRoutes };
