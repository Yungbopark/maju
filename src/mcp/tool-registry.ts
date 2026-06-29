import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ConversationService } from '../conversation/conversation.service';
import {
  GET_MAJU_STATUS_TOOL_NAME,
  getMajuStatus,
} from './tools/get-maju-status.tool';
import { START_CONVERSATION_TOOL_NAME } from './tools/start-conversation.tool';

@Injectable()
export class ToolRegistry {
  constructor(private readonly conversationService: ConversationService) {}

  register(server: McpServer): void {
    server.registerTool(
      GET_MAJU_STATUS_TOOL_NAME,
      {
        title: 'Get Maju Status',
        description:
          'Returns current Maju(마주) server status and basic project information.',
        inputSchema: {},
        outputSchema: {
          status: z.literal('ok'),
          service: z.literal('maju'),
          description: z.string(),
          version: z.string(),
        },
        annotations: {
          title: 'Get Maju Status',
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
          idempotentHint: true,
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

    server.registerTool(
      START_CONVERSATION_TOOL_NAME,
      {
        title: 'Start Conversation',
        description:
          'Starts the first Maju(마주) conversation with a daily check-in opening.',
        inputSchema: {},
        outputSchema: {
          assistantOpening: z.string(),
          conversationIntent: z.literal('DAILY_CHECK_IN'),
          conversationState: z.literal('OPENING'),
          nextAction: z.literal('WAIT_USER_RESPONSE'),
        },
        annotations: {
          title: 'Start Conversation',
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
          idempotentHint: true,
        },
      },
      async () => {
        const conversation = this.conversationService.startConversation();

        return {
          structuredContent: conversation,
          content: [
            {
              type: 'text',
              text: JSON.stringify(conversation),
            },
          ],
        };
      },
    );
  }
}
