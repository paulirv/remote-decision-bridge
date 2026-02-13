import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BridgeClient } from '../lib/bridge-client.js';

export function registerNotifyRemote(server: McpServer, client: BridgeClient, sessionId: string, project?: string) {
  server.tool(
    'notify_remote',
    'Send a fire-and-forget status notification to the user via Telegram. ' +
      'Use this to keep the user informed about session progress (e.g., "Tests passed", "Starting deployment"). ' +
      'Set severity to "warning" for issues that need attention or "error" for failures.',
    {
      text: z.string().describe('The notification message'),
      severity: z
        .enum(['info', 'warning', 'error'])
        .optional()
        .default('info')
        .describe('Notification severity level — controls emoji prefix'),
    },
    async ({ text, severity }) => {
      await client.notify(text, sessionId, severity, project);
      return {
        content: [{ type: 'text' as const, text: 'Notification sent.' }],
      };
    },
  );
}
