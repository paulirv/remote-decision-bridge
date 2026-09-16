import type { Env, NotifySeverity } from '../types.js';

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
  project?: string,
  chatId: string = env.TELEGRAM_CHAT_ID,
): Promise<number | undefined> {
  const header = project ? `*${escapeMarkdown(project)}* — Decision Needed` : '*Decision Needed*';
  const message = `${header}\n_Session: ${escapeMarkdown(sessionId)}_\n\n${escapeMarkdown(text)}`;

  const keyboard: InlineKeyboardButton[][] = options.map((opt, i) => [
    { text: `${i + 1}. ${opt}`, callback_data: `${questionId}:${i}` },
  ]);

  // Add free-text option
  keyboard.push([{ text: 'Let me type...', callback_data: `${questionId}:freetext` }]);

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
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

const SEVERITY_EMOJI: Record<NotifySeverity, string> = {
  info: '\u2139\uFE0F',
  warning: '\u26A0\uFE0F',
  error: '\uD83D\uDEA8',
};

export async function sendNotification(
  env: Env,
  text: string,
  sessionId: string,
  severity: NotifySeverity = 'info',
  project?: string,
  chatId: string = env.TELEGRAM_CHAT_ID,
): Promise<void> {
  const emoji = SEVERITY_EMOJI[severity];
  const header = project ? `${emoji} *${escapeMarkdown(project)}* — Status Update` : `${emoji} *Status Update*`;
  const message = `${header}\n_Session: ${escapeMarkdown(sessionId)}_\n\n${escapeMarkdown(text)}`;

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'MarkdownV2',
    }),
  });

  if (!res.ok) {
    console.error('Telegram sendNotification failed:', await res.text());
  }
}

export async function sendAnswerConfirmation(
  env: Env,
  answer: string,
  replyToMessageId: number,
  chatId: string = env.TELEGRAM_CHAT_ID,
): Promise<void> {
  const message = `\u2705 *Answered:* ${escapeMarkdown(answer)}`;

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'MarkdownV2',
      reply_to_message_id: replyToMessageId,
    }),
  });

  if (!res.ok) {
    console.error('Telegram sendAnswerConfirmation failed:', await res.text());
  }
}

/** Tell a chat that answered after the decision was made which answer stands. */
export async function sendAlreadyDecided(
  env: Env,
  answer: string,
  chatId: string,
  replyToMessageId?: number,
): Promise<void> {
  const message = `\u2139\uFE0F *Already decided:* ${escapeMarkdown(answer)}`;

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'MarkdownV2',
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    }),
  });

  if (!res.ok) {
    console.error('Telegram sendAlreadyDecided failed:', await res.text());
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
