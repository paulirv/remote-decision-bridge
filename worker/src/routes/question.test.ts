import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index.js';

const mockKV = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const ENV = {
  QUESTIONS: mockKV as unknown as KVNamespace,
  TELEGRAM_BOT_TOKEN: 'test-token',
  TELEGRAM_CHAT_ID: '12345',
  BRIDGE_SECRET: 'test-secret',
};

const AUTH_HEADERS = {
  Authorization: 'Bearer test-secret',
  'Content-Type': 'application/json',
};

beforeEach(() => {
  vi.resetAllMocks();
  // Mock global fetch for Telegram API calls
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
});

describe('POST /question', () => {
  it('creates a question and returns 201 with questionId', async () => {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          text: 'Should we use Redis or KV?',
          options: ['Redis', 'KV'],
          sessionId: 'test-session',
        }),
      },
      ENV,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { questionId: string };
    expect(body.questionId).toBeDefined();
    expect(typeof body.questionId).toBe('string');
    expect(mockKV.put).toHaveBeenCalled();
  });

  it('returns 400 when text is missing', async () => {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ options: ['A', 'B'], sessionId: 's1' }),
      },
      ENV,
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when options are missing', async () => {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'Question?', sessionId: 's1' }),
      },
      ENV,
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when sessionId is missing', async () => {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'Question?', options: ['A', 'B'] }),
      },
      ENV,
    );

    expect(res.status).toBe(400);
  });

  it('stores question in KV with correct TTL', async () => {
    await app.request(
      '/question',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          text: 'Pick one',
          options: ['A', 'B'],
          sessionId: 's1',
          timeout: 300,
        }),
      },
      ENV,
    );

    // First put stores the initial question, second updates with telegramMessageId
    const firstCall = mockKV.put.mock.calls[0];
    expect(firstCall[0]).toMatch(/^q:/);
    expect(firstCall[2]).toEqual({ expirationTtl: 360 }); // 300 + 60
  });
});
