import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { BridgeClient } from '../lib/bridge-client.js';

export function registerNotifyRemote(server: McpServer, client: BridgeClient, sessionId: string) {
  server.registerTool(
    'notify_remote',
    {
      title: 'Notify Remote',
      description:
        'Send a fire-and-forget status notification to the user via Telegram. ' +
        'Use this to keep the user informed about session progress (e.g., "Tests passed", "Starting deployment").',
      inputSchema: {
        text: z.string().describe('The notification message'),
      },
    },
    async ({ text }) => {
      await client.notify(text, sessionId);
      return {
        content: [{ type: 'text' as const, text: 'Notification sent.' }],
      };
    },
  );
}
