import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  GET_MAJU_STATUS_TOOL_NAME,
  getMajuStatus,
} from './tools/get-maju-status.tool';

@Injectable()
export class ToolRegistry {
  register(server: McpServer): void {
    server.registerTool(
      GET_MAJU_STATUS_TOOL_NAME,
      {
        title: 'Get Maju Status',
        description:
          'Returns current Maju server status and basic project information.',
        inputSchema: {},
        outputSchema: {
          status: z.literal('ok'),
          service: z.literal('maju'),
          description: z.string(),
          version: z.string(),
        },
      },
      async () => {
        const status = getMajuStatus();

        return {
          structuredContent: status,
          content: [
            {
              type: 'text',
              text: JSON.stringify(status),
            },
          ],
        };
      },
    );
  }
}
