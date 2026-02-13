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
});

describe('GET /answer/:id', () => {
  it('returns 404 when question not found', async () => {
    mockKV.get.mockResolvedValue(null);

    const res = await app.request(
      '/answer/nonexistent-id',
      { headers: { Authorization: 'Bearer test-secret' } },
      ENV,
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Question not found or expired');
  });

  it('returns 204 when question exists but no answer yet', async () => {
    mockKV.get.mockResolvedValue(
      JSON.stringify({
        id: 'q1',
        text: 'Pick one',
        options: ['A', 'B'],
        sessionId: 's1',
        createdAt: '2026-02-13T00:00:00Z',
      }),
    );

    const res = await app.request(
      '/answer/q1',
      { headers: { Authorization: 'Bearer test-secret' } },
      ENV,
    );

    expect(res.status).toBe(204);
  });

  it('returns 200 with answer when question is answered', async () => {
    mockKV.get.mockResolvedValue(
      JSON.stringify({
        id: 'q1',
        text: 'Pick one',
        options: ['A', 'B'],
        sessionId: 's1',
        createdAt: '2026-02-13T00:00:00Z',
        answer: 'A',
        answeredAt: '2026-02-13T00:01:00Z',
      }),
    );

    const res = await app.request(
      '/answer/q1',
      { headers: { Authorization: 'Bearer test-secret' } },
      ENV,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { questionId: string; answer: string; answeredAt: string };
    expect(body.questionId).toBe('q1');
    expect(body.answer).toBe('A');
    expect(body.answeredAt).toBe('2026-02-13T00:01:00Z');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await app.request('/answer/q1', {}, ENV);
    expect(res.status).toBe(401);
  });
});
