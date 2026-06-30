import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ConversationService } from '../conversation/conversation.service';
import { inspectRequestContext } from './request-context-inspection';
import {
  GET_MAJU_STATUS_TOOL_NAME,
  getMajuStatus,
} from './tools/get-maju-status.tool';
import { CONTINUE_CONVERSATION_TOOL_NAME } from './tools/continue-conversation.tool';
import { GET_REQUEST_CONTEXT_TOOL_NAME } from './tools/get-request-context.tool';
import { START_CONVERSATION_TOOL_NAME } from './tools/start-conversation.tool';
import { traceStartConversationInvocation } from './tool-invocation-trace';

const continueConversationInputSchema = z
  .object({
    userMessage: z
      .string()
      .describe("The user's latest message in the conversation."),
  })
  .strict();

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
      async (args, extra) => {
        await traceStartConversationInvocation({
          toolName: START_CONVERSATION_TOOL_NAME,
          timestamp: new Date().toISOString(),
          requestId: extra.requestId,
          sessionId: extra.sessionId,
          arguments: args,
          extra,
        });

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

    server.registerTool(
      CONTINUE_CONVERSATION_TOOL_NAME,
      {
        title: 'Continue Conversation',
        description:
          "Continues a Maju(마주) conversation using the user's latest message.",
        inputSchema: continueConversationInputSchema,
        outputSchema: {
          assistantReply: z.string(),
          conversationIntent: z.enum([
            'MEAL_FOLLOW_UP',
            'MEAL_CARE',
            'DAILY_CHECK_IN',
          ]),
          conversationState: z.enum(['FOLLOW_UP', 'CARE_SUGGESTION']),
          nextAction: z.literal('WAIT_USER_RESPONSE'),
        },
        annotations: {
          title: 'Continue Conversation',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (args) => {
        const { userMessage } = continueConversationInputSchema.parse(args);
        const conversation =
          this.conversationService.continueConversation(userMessage);

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

    server.registerTool(
      GET_REQUEST_CONTEXT_TOOL_NAME,
      {
        title: 'Get Request Context',
        description:
          'Inspects the request context delivered to the Maju(마주) MCP server.',
        inputSchema: {},
        outputSchema: {
          headers: z.record(z.string(), z.unknown()),
          request: z.record(z.string(), z.unknown()),
          session: z.record(z.string(), z.unknown()),
          user: z.record(z.string(), z.unknown()),
          environment: z.record(z.string(), z.unknown()),
        },
        annotations: {
          title: 'Get Request Context',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (_args, extra) => {
        const requestContext = await inspectRequestContext(extra);

        return {
          structuredContent: requestContext,
          content: [
            {
              type: 'text',
              text: JSON.stringify(requestContext),
            },
          ],
        };
      },
    );
  }
}
