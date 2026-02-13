export interface BridgeConfig {
  workerUrl: string;
  bridgeSecret: string;
  pollIntervalMs: number;  // default 2000
  timeoutMs: number;       // default 600000 (10 min)
}

export interface QuestionResponse {
  questionId: string;
}

export interface AnswerResponse {
  questionId: string;
  answer: string;
  answeredAt: string;
}
