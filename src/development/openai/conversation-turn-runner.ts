import { openAIFunctionTools } from './function-adapter';
import {
  OpenAIClient,
  OpenAIResponse,
  OpenAIResponseOutputItem,
} from './openai-client';
import { DevelopmentToolRunner, ToolRunResult } from './tool-runner';

export type DevelopmentConversationTurn = {
  assistantMessage: string;
  selectedTool: string | null;
  toolArguments: Record<string, unknown>;
  toolResult: Record<string, unknown>;
  conversationState: unknown;
  conversationIntent: unknown;
  nextAction: unknown;
  rawTrace: Record<string, unknown>;
  responseId?: string;
};

function parseToolArguments(rawArguments: string | undefined): Record<string, unknown> {
  if (!rawArguments) {
    return {};
  }

  return JSON.parse(rawArguments) as Record<string, unknown>;
}

function getFunctionCalls(response: OpenAIResponse): OpenAIResponseOutputItem[] {
  return (response.output ?? []).filter((item) => item.type === 'function_call');
}

function getAssistantText(response: OpenAIResponse): string {
  if (response.output_text) {
    return response.output_text;
  }

  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join('\n');
}

function createEmptyTurn(
  userMessage: string,
  response: OpenAIResponse,
): DevelopmentConversationTurn {
  const assistantMessage = getAssistantText(response);

  return {
    assistantMessage,
    selectedTool: null,
    toolArguments: {},
    toolResult: {},
    conversationState: null,
    conversationIntent: null,
    nextAction: null,
    rawTrace: {
      userMessage,
      initialResponse: response,
      finalResponse: response,
      toolRuns: [],
    },
    responseId: response.id,
  };
}

export class DevelopmentConversationTurnRunner {
  constructor(
    private readonly client: OpenAIClient,
    private readonly runner: DevelopmentToolRunner,
  ) {}

  async runTurn(
    userMessage: string,
    previousResponseId?: string,
  ): Promise<DevelopmentConversationTurn> {
    const initialResponse = await this.client.createResponse({
      input: userMessage,
      previousResponseId,
      tools: openAIFunctionTools,
    });
    const functionCalls = getFunctionCalls(initialResponse);

    if (functionCalls.length === 0) {
      return createEmptyTurn(userMessage, initialResponse);
    }

    const toolRuns: ToolRunResult[] = [];
    const toolOutputs: Array<Record<string, unknown>> = [];

    for (const functionCall of functionCalls) {
      const toolArguments = parseToolArguments(functionCall.arguments);
      const toolRun = await this.runner.runTool(
        functionCall.name ?? '',
        toolArguments,
      );

      toolRuns.push(toolRun);
      toolOutputs.push({
        type: 'function_call_output',
        call_id: functionCall.call_id,
        output: JSON.stringify(toolRun.rawToolResponse),
      });
    }

    const finalResponse = await this.client.createResponse({
      input: toolOutputs,
      previousResponseId: initialResponse.id,
      tools: openAIFunctionTools,
    });
    const primaryToolRun = toolRuns[toolRuns.length - 1];
    const toolResult = primaryToolRun?.toolResult ?? {};

    return {
      assistantMessage: getAssistantText(finalResponse),
      selectedTool: primaryToolRun?.selectedTool ?? null,
      toolArguments: primaryToolRun?.toolArguments ?? {},
      toolResult,
      conversationState: toolResult.conversationState ?? null,
      conversationIntent: toolResult.conversationIntent ?? null,
      nextAction: toolResult.nextAction ?? null,
      rawTrace: {
        userMessage,
        initialResponse,
        toolRuns,
        finalResponse,
      },
      responseId: finalResponse.id,
    };
  }
}
