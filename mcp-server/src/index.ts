#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { BridgeClient } from './lib/bridge-client.js';
import { registerAskRemote } from './tools/ask-remote.js';
import { registerNotifyRemote } from './tools/notify-remote.js';

const WORKER_URL = process.env.BRIDGE_WORKER_URL;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;

if (!WORKER_URL || !BRIDGE_SECRET) {
  console.error('Missing required env vars: BRIDGE_WORKER_URL, BRIDGE_SECRET');
  process.exit(1);
}

const sessionId = process.env.BRIDGE_SESSION_ID ?? `session-${Date.now()}`;

const client = new BridgeClient({
  workerUrl: WORKER_URL,
  bridgeSecret: BRIDGE_SECRET,
  pollIntervalMs: Number(process.env.BRIDGE_POLL_INTERVAL_MS ?? 2000),
  timeoutMs: Number(process.env.BRIDGE_TIMEOUT_MS ?? 600_000),
});

const server = new McpServer({
  name: 'remote-decision-bridge',
  version: '0.1.0',
});

registerAskRemote(server, client, sessionId);
registerNotifyRemote(server, client, sessionId);

const transport = new StdioServerTransport();
await server.connect(transport);
