import type { Context, Next } from 'hono';
import type { Env } from '../types.js';

/** Verify shared secret on MCP server → Worker requests. */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token || token !== c.env.BRIDGE_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
}
