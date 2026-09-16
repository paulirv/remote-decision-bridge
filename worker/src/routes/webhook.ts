import { Hono } from 'hono';
import type { DeliveredMessage, Env, StoredQuestion } from '../types.js';
import { sendAlreadyDecided, sendAnswerConfirmation } from '../lib/telegram.js';

const app = new Hono<{ Bindings: Env }>();

interface TelegramUpdate {
  callback_query?: {
    id: string;
    data: string;
    message?: { chat: { id: number } };
  };
  message?: {
    chat: { id: number };
    text?: string;
    reply_to_message?: { message_id: number };
  };
}

/** POST /webhook/telegram — Telegram sends button taps and text replies here. */
app.post('/', async (c) => {
  // Verify webhook origin if secret is configured (set via Telegram setWebhook secret_token)
  if (c.env.WEBHOOK_SECRET) {
    const token = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    if (token !== c.env.WEBHOOK_SECRET) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  const update = await c.req.json<TelegramUpdate>();

  // Handle inline keyboard button tap
  if (update.callback_query) {
    const { id: callbackId, data } = update.callback_query;
    const [questionId, selection] = data.split(':');

    if (!questionId) {
      return c.json({ ok: true });
    }

    // Acknowledge the callback to remove loading indicator
    await answerCallback(c.env, callbackId);

    if (selection === 'freetext') {
      // Store that we're waiting for free text — user's next message is the answer
      await c.env.QUESTIONS.put(`pending:${update.callback_query.message?.chat.id}`, questionId, {
        expirationTtl: 600,
      });
      return c.json({ ok: true });
    }

    // Resolve option index to answer text
    const raw = await c.env.QUESTIONS.get(`q:${questionId}`);
    if (!raw) return c.json({ ok: true });

    const question: StoredQuestion = JSON.parse(raw);
    const optionIndex = parseInt(selection, 10);
    const answer = question.options[optionIndex] ?? selection;
    const chatId = update.callback_query.message?.chat.id;

    await recordAnswer(c.env, question, answer, chatId === undefined ? undefined : String(chatId));
    return c.json({ ok: true });
  }

  // Handle free text reply
  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const pendingQuestionId = await c.env.QUESTIONS.get(`pending:${chatId}`);

    if (pendingQuestionId) {
      const raw = await c.env.QUESTIONS.get(`q:${pendingQuestionId}`);
      if (raw) {
        const question: StoredQuestion = JSON.parse(raw);
        await recordAnswer(c.env, question, update.message.text, String(chatId));
      }
      await c.env.QUESTIONS.delete(`pending:${chatId}`);
    }
  }

  return c.json({ ok: true });
});

/**
 * Record the first answer to a question and confirm it in every chat the
 * question reached. A question is decided once: a later answer — from the same
 * chat or another recipient's — changes nothing and is told which answer stands.
 */
async function recordAnswer(
  env: Env,
  question: StoredQuestion,
  answer: string,
  answeringChatId?: string,
): Promise<void> {
  const delivered = deliveredMessages(env, question);

  if (question.answer !== undefined) {
    if (answeringChatId) {
      const own = delivered.find((m) => m.chatId === answeringChatId);
      await sendAlreadyDecided(env, question.answer, answeringChatId, own?.messageId);
    }
    return;
  }

  question.answer = answer;
  question.answeredAt = new Date().toISOString();
  await env.QUESTIONS.put(`q:${question.id}`, JSON.stringify(question), {
    expirationTtl: 120,
  });

  // Thread a confirmation reply to the question in each recipient's chat
  for (const m of delivered) {
    await sendAnswerConfirmation(env, answer, m.messageId, m.chatId);
  }
}

/** The messages a question was delivered as; a pre-recipient question reached only the default chat. */
function deliveredMessages(env: Env, question: StoredQuestion): DeliveredMessage[] {
  if (question.messages?.length) return question.messages;
  if (question.telegramMessageId) return [{ chatId: env.TELEGRAM_CHAT_ID, messageId: question.telegramMessageId }];
  return [];
}

async function answerCallback(env: Env, callbackQueryId: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

export { app as webhookRoutes };
