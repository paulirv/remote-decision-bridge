import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index.js';

const ENV = {
  QUESTIONS: {} as KVNamespace,
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
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
  );
});

describe('POST /notify', () => {
  it('sends notification and returns ok', async () => {
    const res = await app.request(
      '/notify',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'Tests passed', sessionId: 's1' }),
      },
      ENV,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('returns 400 when text is missing', async () => {
    const res = await app.request(
      '/notify',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ sessionId: 's1' }),
      },
      ENV,
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when sessionId is missing', async () => {
    const res = await app.request(
      '/notify',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'Hello' }),
      },
      ENV,
    );

    expect(res.status).toBe(400);
  });

  it('passes severity to Telegram sendMessage', async () => {
    await app.request(
      '/notify',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'Build failed', sessionId: 's1', severity: 'error' }),
      },
      ENV,
    );

    const fetchCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sendCall = fetchCalls.find((c: any) => c[0].includes('sendMessage'));
    expect(sendCall).toBeDefined();
    const body = JSON.parse(sendCall![1].body);
    // Error emoji should be in the message
    expect(body.text).toContain('\uD83D\uDEA8');
  });

  it('defaults to info severity emoji', async () => {
    await app.request(
      '/notify',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'All good', sessionId: 's1' }),
      },
      ENV,
    );

    const fetchCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sendCall = fetchCalls.find((c: any) => c[0].includes('sendMessage'));
    const body = JSON.parse(sendCall![1].body);
    // Info emoji
    expect(body.text).toContain('\u2139\uFE0F');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await app.request(
      '/notify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test', sessionId: 's1' }),
      },
      ENV,
    );

    expect(res.status).toBe(401);
  });
});
