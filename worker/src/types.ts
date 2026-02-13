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
  project?: string;
  timeout?: number; // seconds, default 600
}

export interface StoredQuestion {
  id: string;
  text: string;
  options: string[];
  sessionId: string;
  project?: string;
  telegramMessageId?: number;
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
}
