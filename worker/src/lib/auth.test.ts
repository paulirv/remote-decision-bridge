import { describe, it, expect } from 'vitest';
import app from '../index.js';

const ENV = {
  QUESTIONS: {} as KVNamespace,
  TELEGRAM_BOT_TOKEN: 'test-token',
  TELEGRAM_CHAT_ID: '12345',
  BRIDGE_SECRET: 'test-secret-abc123',
};

describe('auth middleware', () => {
  it('rejects requests without Authorization header', async () => {
    const res = await app.request('/question', { method: 'POST' }, ENV);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('rejects requests with wrong secret', async () => {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong-secret' },
      },
      ENV,
    );
    expect(res.status).toBe(401);
  });

  it('rejects requests with empty Bearer token', async () => {
    const res = await app.request(
      '/question',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' },
      },
      ENV,
    );
    expect(res.status).toBe(401);
  });
});
