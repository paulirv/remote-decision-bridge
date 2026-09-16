export interface Env {
  QUESTIONS: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  /**
   * Recipient allow-list: a JSON object mapping a declared recipient id to its
   * Telegram chat id, e.g. {"paul":"7847771855","ops":"-100123"}. Set as a
   * secret (`wrangler secret put TELEGRAM_RECIPIENTS`). A request's
   * `recipients` may only name ids listed here.
   */
  TELEGRAM_RECIPIENTS?: string;
  BRIDGE_SECRET: string;
  WEBHOOK_SECRET?: string;
}

export interface QuestionPayload {
  text: string;
  options: string[];
  sessionId: string;
  project?: string;
  timeout?: number; // seconds, default 600
  recipients?: string[]; // declared recipient ids; absent = TELEGRAM_CHAT_ID
}

export interface DeliveredMessage {
  chatId: string;
  messageId: number;
}

export interface StoredQuestion {
  id: string;
  text: string;
  options: string[];
  sessionId: string;
  project?: string;
  telegramMessageId?: number; // first delivered message (kept for pre-recipient readers)
  messages?: DeliveredMessage[]; // every chat the question reached
  createdAt: string;
  answeredAt?: string;
  answer?: string;
}

export type NotifySeverity = 'info' | 'warning' | 'error';

export interface NotifyPayload {
  text: string;
  sessionId: string;
  project?: string;
  severity?: NotifySeverity;
  recipients?: string[]; // declared recipient ids; absent = TELEGRAM_CHAT_ID
}
