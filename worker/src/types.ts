export interface Env {
  QUESTIONS: KVNamespace;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  BRIDGE_SECRET: string;
}

export interface QuestionPayload {
  text: string;
  options: string[];
  sessionId: string;
  timeout?: number; // seconds, default 600
}

export interface StoredQuestion {
  id: string;
  text: string;
  options: string[];
  sessionId: string;
  telegramMessageId?: number;
  createdAt: string;
  answeredAt?: string;
  answer?: string;
}

export interface NotifyPayload {
  text: string;
  sessionId: string;
}
