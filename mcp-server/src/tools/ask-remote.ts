import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BridgeClient } from '../lib/bridge-client.js';

export function registerAskRemote(server: McpServer, client: BridgeClient, sessionId: string, project?: string) {
  server.tool(
    'ask_remote',
    'Send a decision question to the user via Telegram and wait for their response. ' +
      'Use this when you need human input during an autonomous session and the user may not be at their computer.',
    {
      text: z.string().describe('The question to ask the user'),
      options: z.array(z.string()).min(2).max(6).describe('Answer choices (2-6 options)'),
    },
    async ({ text, options }) => {
      const questionId = await client.postQuestion(text, options, sessionId, project);
      const answer = await client.pollForAnswer(questionId);

      if (answer === null) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Remote question timed out — the user did not respond. Proceed with your best judgment or skip this decision.',
            },
          ],
        };
      }

      return {
        content: [{ type: 'text' as const, text: `User answered: ${answer}` }],
      };
    },
  );
}
