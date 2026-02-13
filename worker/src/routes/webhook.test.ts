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

beforeEach(() => {
  vi.resetAllMocks();
  // Mock Telegram API calls (answerCallbackQuery, sendMessage for confirmations)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
  );
});

const storedQuestion = JSON.stringify({
  id: 'q1',
  text: 'Pick a color',
  options: ['Red', 'Blue', 'Green'],
  sessionId: 's1',
  telegramMessageId: 42,
  createdAt: '2026-02-13T00:00:00Z',
});

describe('POST /webhook/telegram — button taps', () => {
  it('stores answer from button tap', async () => {
    mockKV.get.mockResolvedValue(storedQuestion);

    const res = await app.request(
      '/webhook/telegram',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query: {
            id: 'cb1',
            data: 'q1:1',
            message: { chat: { id: 12345 } },
          },
        }),
      },
      ENV,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    // Should store the answer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const putCall = mockKV.put.mock.calls.find((c: any) => c[0] === 'q:q1');
    expect(putCall).toBeDefined();
    const stored = JSON.parse(putCall![1] as string);
    expect(stored.answer).toBe('Blue'); // index 1
    expect(stored.answeredAt).toBeDefined();
  });

  it('sets pending state for freetext selection', async () => {
    const res = await app.request(
      '/webhook/telegram',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query: {
            id: 'cb2',
            data: 'q1:freetext',
            message: { chat: { id: 12345 } },
          },
        }),
      },
      ENV,
    );

    expect(res.status).toBe(200);
    expect(mockKV.put).toHaveBeenCalledWith('pending:12345', 'q1', { expirationTtl: 600 });
  });

  it('sends threaded confirmation reply after button tap', async () => {
    mockKV.get.mockResolvedValue(storedQuestion);

    await app.request(
      '/webhook/telegram',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query: {
            id: 'cb3',
            data: 'q1:0',
            message: { chat: { id: 12345 } },
          },
        }),
      },
      ENV,
    );

    // fetch called for: answerCallbackQuery + sendMessage (confirmation)
    const fetchCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const confirmationCall = fetchCalls.find(
      (c: any) =>
        c[0].includes('sendMessage') && c[1]?.body?.toString().includes('reply_to_message_id'),
    );
    expect(confirmationCall).toBeDefined();
  });
});

describe('POST /webhook/telegram — free text replies', () => {
  it('stores free text answer when pending question exists', async () => {
    mockKV.get.mockImplementation((key: string) => {
      if (key === 'pending:12345') return Promise.resolve('q1');
      if (key === 'q:q1') return Promise.resolve(storedQuestion);
      return Promise.resolve(null);
    });

    const res = await app.request(
      '/webhook/telegram',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            chat: { id: 12345 },
            text: 'Use option C instead',
          },
        }),
      },
      ENV,
    );

    expect(res.status).toBe(200);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const putCall = mockKV.put.mock.calls.find((c: any) => c[0] === 'q:q1');
    expect(putCall).toBeDefined();
    const stored = JSON.parse(putCall![1] as string);
    expect(stored.answer).toBe('Use option C instead');

    // Should clean up pending state
    expect(mockKV.delete).toHaveBeenCalledWith('pending:12345');
  });

  it('ignores text messages without pending question', async () => {
    mockKV.get.mockResolvedValue(null);

    const res = await app.request(
      '/webhook/telegram',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            chat: { id: 12345 },
            text: 'Random message',
          },
        }),
      },
      ENV,
    );

    expect(res.status).toBe(200);
    expect(mockKV.put).not.toHaveBeenCalled();
  });
});
