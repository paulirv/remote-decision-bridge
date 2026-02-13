import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BridgeClient } from './bridge-client.js';

const config = {
  workerUrl: 'https://test-worker.example.com',
  bridgeSecret: 'test-secret',
  pollIntervalMs: 100, // Fast polling for tests
  timeoutMs: 500,      // Short timeout for tests
};

let client: BridgeClient;

beforeEach(() => {
  client = new BridgeClient(config);
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BridgeClient.postQuestion', () => {
  it('sends question and returns questionId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ questionId: 'q-123' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const id = await client.postQuestion('Pick one', ['A', 'B'], 'session-1');

    expect(id).toBe('q-123');
    expect(fetch).toHaveBeenCalledWith(
      'https://test-worker.example.com/question',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-secret',
        }),
      }),
    );
  });

  it('includes timeout in seconds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ questionId: 'q-123' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await client.postQuestion('Q?', ['A', 'B'], 's1');

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.timeout).toBe(0); // 500ms / 1000 = 0 (floored)
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })),
    );

    await expect(client.postQuestion('Q?', ['A', 'B'], 's1')).rejects.toThrow(
      'Bridge POST /question failed: 401',
    );
  });
});

describe('BridgeClient.pollForAnswer', () => {
  it('returns answer immediately when available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ questionId: 'q1', answer: 'Yes', answeredAt: '2026-02-13T00:00:00Z' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const answer = await client.pollForAnswer('q1');
    expect(answer).toBe('Yes');
  });

  it('returns null when question is 404 (expired)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Not found', { status: 404 })),
    );

    const answer = await client.pollForAnswer('q1');
    expect(answer).toBeNull();
  });

  it('returns null on timeout after polling', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    const answer = await client.pollForAnswer('q1');
    expect(answer).toBeNull();
  });

  it('polls until answer arrives', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({ questionId: 'q1', answer: 'B', answeredAt: '2026-02-13T00:00:00Z' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }),
    );

    const answer = await client.pollForAnswer('q1');
    expect(answer).toBe('B');
    expect(callCount).toBe(3);
  });
});

describe('BridgeClient.notify', () => {
  it('sends notification with auth header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );

    await client.notify('Tests passed', 'session-1');

    expect(fetch).toHaveBeenCalledWith(
      'https://test-worker.example.com/notify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-secret',
        }),
      }),
    );
  });

  it('includes severity in request body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );

    await client.notify('Build failed', 'session-1', 'error');

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.severity).toBe('error');
    expect(body.text).toBe('Build failed');
    expect(body.sessionId).toBe('session-1');
  });
});
