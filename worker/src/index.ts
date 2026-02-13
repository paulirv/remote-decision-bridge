import { Hono } from 'hono';
import type { Env } from './types.js';
import { questionRoutes } from './routes/question.js';
import { answerRoutes } from './routes/answer.js';
import { webhookRoutes } from './routes/webhook.js';
import { notifyRoutes } from './routes/notify.js';

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get('/', (c) => c.json({ service: 'remote-decision-bridge', status: 'ok' }));

// MCP server → Worker (authenticated)
app.route('/question', questionRoutes);
app.route('/answer', answerRoutes);
app.route('/notify', notifyRoutes);

// Telegram → Worker (webhook)
app.route('/webhook/telegram', webhookRoutes);

export default app;
