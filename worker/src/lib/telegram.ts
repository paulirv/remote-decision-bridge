import type { Env } from '../types.js';

const TELEGRAM_API = 'https://api.telegram.org';

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export async function sendQuestion(
  env: Env,
  questionId: string,
  text: string,
  options: string[],
  sessionId: string,
): Promise<number | undefined> {
  const message = `*Decision Needed*\n_Session: ${escapeMarkdown(sessionId)}_\n\n${escapeMarkdown(text)}`;

  const keyboard: InlineKeyboardButton[][] = options.map((opt, i) => [
    { text: `${i + 1}. ${opt}`, callback_data: `${questionId}:${i}` },
  ]);

  // Add free-text option
  keyboard.push([{ text: 'Let me type...', callback_data: `${questionId}:freetext` }]);

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: keyboard },
    }),
  });

  if (!res.ok) {
    console.error('Telegram sendMessage failed:', await res.text());
    return undefined;
  }

  const data = (await res.json()) as { result?: { message_id: number } };
  return data.result?.message_id;
}

export async function sendNotification(env: Env, text: string, sessionId: string): Promise<void> {
  const message = `*Status Update*\n_Session: ${escapeMarkdown(sessionId)}_\n\n${escapeMarkdown(text)}`;

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'MarkdownV2',
    }),
  });

  if (!res.ok) {
    console.error('Telegram sendNotification failed:', await res.text());
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
