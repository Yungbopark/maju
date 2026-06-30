import { ConversationService } from '../../conversation/conversation.service';
import { inspectRequestContext } from '../../mcp/request-context-inspection';
import { getMajuStatus } from '../../mcp/tools/get-maju-status.tool';

export type ToolRunResult = {
  selectedTool: string;
  toolArguments: Record<string, unknown>;
  toolResult: Record<string, unknown>;
  conversationState: unknown;
  rawToolResponse: Record<string, unknown>;
};

const DEVELOPMENT_SUBJECT = 'local-playground-subject';

export class DevelopmentToolRunner {
  private readonly conversationService = new ConversationService();

  async runTool(
    toolName: string,
    toolArguments: Record<string, unknown>,
  ): Promise<ToolRunResult> {
    const toolResult = await this.executeTool(toolName, toolArguments);

    return {
      selectedTool: toolName,
      toolArguments,
      toolResult,
      conversationState:
        toolResult.conversationState ?? toolResult.lastConversationState ?? null,
      rawToolResponse: toolResult,
    };
  }

  private async executeTool(
    toolName: string,
    toolArguments: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (toolName) {
      case 'getMajuStatus':
        return getMajuStatus();

      case 'startConversation':
        return this.conversationService.startConversation(DEVELOPMENT_SUBJECT);

      case 'continueConversation':
        return this.conversationService.continueConversation(
          String(toolArguments.userMessage ?? ''),
          DEVELOPMENT_SUBJECT,
        );

      case 'getConversationContext':
        return this.conversationService.getConversationContext(
          DEVELOPMENT_SUBJECT,
        );

      case 'getRequestContext':
        return inspectRequestContext({
          requestId: 'local-playground',
          sessionId: 'local-playground-session',
          requestInfo: {
            method: 'DEVELOPMENT',
            headers: {
              'user-agent': 'maju-local-playground',
              'x-openai-subject': DEVELOPMENT_SUBJECT,
            },
          },
        });

      default:
        throw new Error(`Unknown development tool: ${toolName}`);
    }
  }
}
