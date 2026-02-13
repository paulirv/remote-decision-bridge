import type { BridgeConfig, QuestionResponse, AnswerResponse } from '../types.js';

export class BridgeClient {
  constructor(private config: BridgeConfig) {}

  /** Send a question to the Worker and return the question ID. */
  async postQuestion(text: string, options: string[], sessionId: string): Promise<string> {
    const res = await fetch(`${this.config.workerUrl}/question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.bridgeSecret}`,
      },
      body: JSON.stringify({
        text,
        options,
        sessionId,
        timeout: Math.floor(this.config.timeoutMs / 1000),
      }),
    });

    if (!res.ok) {
      throw new Error(`Bridge POST /question failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as QuestionResponse;
    return data.questionId;
  }

  /** Poll for an answer until it arrives or timeout. */
  async pollForAnswer(questionId: string): Promise<string | null> {
    const deadline = Date.now() + this.config.timeoutMs;

    while (Date.now() < deadline) {
      const res = await fetch(`${this.config.workerUrl}/answer/${questionId}`, {
        headers: { Authorization: `Bearer ${this.config.bridgeSecret}` },
      });

      if (res.status === 200) {
        const data = (await res.json()) as AnswerResponse;
        return data.answer;
      }

      if (res.status === 404) {
        return null; // Question expired
      }

      // 204 = no answer yet, keep polling
      await sleep(this.config.pollIntervalMs);
    }

    return null; // Timed out
  }

  /** Send a fire-and-forget notification. */
  async notify(text: string, sessionId: string): Promise<void> {
    await fetch(`${this.config.workerUrl}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.bridgeSecret}`,
      },
      body: JSON.stringify({ text, sessionId }),
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
