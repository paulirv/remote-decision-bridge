import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index.js';
import { resolveRecipients } from '../lib/recipients.js';

const store = new Map<string, string>();
const mockKV = {
  put: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  get: vi.fn(async (key: string) => store.get(key) ?? null),
  delete: vi.fn(async (key: string) => {
    store.delete(key);
  }),
};

const ENV = {
  QUESTIONS: mockKV as unknown as KVNamespace,
  TELEGRAM_BOT_TOKEN: 'test-token',
  TELEGRAM_CHAT_ID: '12345',
  TELEGRAM_RECIPIENTS: JSON.stringify({ paul: '12345', ops: '-100777', pager: 555 }),
  BRIDGE_SECRET: 'test-secret',
};

const AUTH_HEADERS = {
  Authorization: 'Bearer test-secret',
  'Content-Type': 'application/json',
};

let nextMessageId = 100;

/** Every Telegram API call as { method, body }. */
function telegramCalls(): { method: string; body: Record<string, unknown> }[] {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  return fetchMock.mock.calls.map(([url, init]) => ({
    method: String(url).split('/').pop() ?? '',
    body: JSON.parse(String((init as RequestInit).body)),
  }));
}

const sends = () => telegramCalls().filter((c) => c.method === 'sendMessage');

beforeEach(() => {
  store.clear();
  nextMessageId = 100;
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true, result: { message_id: nextMessageId++ } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
});

describe('resolveRecipients', () => {
  it('absent or empty recipients resolve to TELEGRAM_CHAT_ID', () => {
    expect(resolveRecipients(ENV, undefined)).toEqual({ ok: true, chatIds: ['12345'] });
    expect(resolveRecipients(ENV, [])).toEqual({ ok: true, chatIds: ['12345'] });
  });

  it('resolves ids through the allow-list, de-duplicating chats', () => {
    expect(resolveRecipients(ENV, ['ops', 'pager', 'ops'])).toEqual({ ok: true, chatIds: ['-100777', '555'] });
  });

  it('names every unknown id', () => {
    expect(resolveRecipients(ENV, ['ops', 'mallory', 'eve'])).toEqual({
      ok: false,
      error: 'Unknown recipient(s): mallory, eve',
    });
  });

  it('rejects every named id when no allow-list is configured', () => {
    const { TELEGRAM_RECIPIENTS: _unused, ...noList } = ENV;
    expect(resolveRecipients(noList, ['paul'])).toEqual({ ok: false, error: 'Unknown recipient(s): paul' });
  });

  it('rejects a malformed recipients field', () => {
    expect(resolveRecipients(ENV, 'ops')).toMatchObject({ ok: false });
    expect(resolveRecipients(ENV, [42])).toMatchObject({ ok: false });
  });
});

describe('POST /notify with recipients', () => {
  it('without recipients delivers to the default chat only', async () => {
    const res = await app.request(
      '/notify',
      { method: 'POST', headers: AUTH_HEADERS, body: JSON.stringify({ text: 'hi', sessionId: 's1' }) },
      ENV,
    );
    expect(res.status).toBe(200);
    expect(sends().map((c) => c.body.chat_id)).toEqual(['12345']);
  });

  it('delivers once to each named recipient chat', async () => {
    const res = await app.request(
      '/notify',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'hi', sessionId: 's1', recipients: ['ops', 'pager'] }),
      },
      ENV,
    );
    expect(res.status).toBe(200);
    expect(sends().map((c) => c.body.chat_id)).toEqual(['-100777', '555']);
  });

  it('rejects an unknown recipient with 400 naming it and sends nothing', async () => {
    const res = await app.request(
      '/notify',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'hi', sessionId: 's1', recipients: ['ops', 'mallory'] }),
      },
      ENV,
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('Unknown recipient(s): mallory');
    expect(sends()).toHaveLength(0);
  });
});

describe('POST /question with recipients', () => {
  it('rejects an unknown recipient with 400 and stores nothing', async () => {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'Q?', options: ['A', 'B'], sessionId: 's1', recipients: ['eve'] }),
      },
      ENV,
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('Unknown recipient(s): eve');
    expect(mockKV.put).not.toHaveBeenCalled();
    expect(sends()).toHaveLength(0);
  });

  it('sends the question to every recipient and records each message', async () => {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'Q?', options: ['A', 'B'], sessionId: 's1', recipients: ['paul', 'ops'] }),
      },
      ENV,
    );
    expect(res.status).toBe(201);
    const { questionId } = (await res.json()) as { questionId: string };
    expect(sends().map((c) => c.body.chat_id)).toEqual(['12345', '-100777']);

    const stored = JSON.parse(store.get(`q:${questionId}`) ?? '{}');
    expect(stored.messages).toEqual([
      { chatId: '12345', messageId: 100 },
      { chatId: '-100777', messageId: 101 },
    ]);
    expect(stored.telegramMessageId).toBe(100);
  });
});

describe('answers across recipients', () => {
  async function ask(recipients?: string[]): Promise<string> {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ text: 'Q?', options: ['A', 'B'], sessionId: 's1', recipients }),
      },
      ENV,
    );
    const { questionId } = (await res.json()) as { questionId: string };
    vi.mocked(globalThis.fetch).mockClear();
    return questionId;
  }

  function tap(questionId: string, option: number, chatId: string) {
    return app.request(
      '/webhook/telegram',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query: { id: 'cb', data: `${questionId}:${option}`, message: { chat: { id: Number(chatId) } } },
        }),
      },
      ENV,
    );
  }

  it('an answer from any recipient decides it and is confirmed in every chat', async () => {
    const id = await ask(['paul', 'ops']);
    await tap(id, 1, '-100777');

    const stored = JSON.parse(store.get(`q:${id}`) ?? '{}');
    expect(stored.answer).toBe('B');
    const confirmations = sends().map((c) => [c.body.chat_id, c.body.reply_to_message_id]);
    expect(confirmations).toEqual([
      ['12345', 100],
      ['-100777', 101],
    ]);

    const answer = await app.request(`/answer/${id}`, { headers: AUTH_HEADERS }, ENV);
    expect(((await answer.json()) as { answer: string }).answer).toBe('B');
  });

  it('a duplicate answer keeps the first and is told it is already decided', async () => {
    const id = await ask(['paul', 'ops']);
    await tap(id, 0, '12345');
    vi.mocked(globalThis.fetch).mockClear();

    await tap(id, 1, '-100777');

    const stored = JSON.parse(store.get(`q:${id}`) ?? '{}');
    expect(stored.answer).toBe('A');
    const replies = sends();
    expect(replies).toHaveLength(1);
    expect(replies[0].body.chat_id).toBe('-100777');
    expect(replies[0].body.reply_to_message_id).toBe(101);
    expect(String(replies[0].body.text)).toContain('Already decided');
  });

  it('a question asked without recipients is confirmed in the default chat as before', async () => {
    const id = await ask();
    await tap(id, 0, '12345');
    expect(sends().map((c) => [c.body.chat_id, c.body.reply_to_message_id])).toEqual([['12345', 100]]);
  });
});
