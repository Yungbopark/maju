import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { openAIFunctionTools } from '../openai/function-adapter';
import {
  OpenAIClient,
  OpenAIResponse,
  OpenAIResponseOutputItem,
} from '../openai/openai-client';
import { DevelopmentToolRunner, ToolRunResult } from '../openai/tool-runner';

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

function printToolRun(userMessage: string, toolRun: ToolRunResult): void {
  console.log('\n--- Tool Trace ---');
  console.log(`User Message: ${userMessage}`);
  console.log(`Selected Tool: ${toolRun.selectedTool}`);
  console.log(`Tool Arguments: ${JSON.stringify(toolRun.toolArguments, null, 2)}`);
  console.log(`Tool Result: ${JSON.stringify(toolRun.toolResult, null, 2)}`);
  console.log(`Conversation State: ${String(toolRun.conversationState ?? '')}`);
  console.log(
    `Raw Tool Response: ${JSON.stringify(toolRun.rawToolResponse, null, 2)}`,
  );
}

async function runOpenAITurn(
  client: OpenAIClient,
  runner: DevelopmentToolRunner,
  userMessage: string,
  previousResponseId?: string,
): Promise<string | undefined> {
  const response = await client.createResponse({
    input: userMessage,
    previousResponseId,
    tools: openAIFunctionTools,
  });
  let currentResponseId: string | undefined = response.id;
  const functionCalls = getFunctionCalls(response);

  if (functionCalls.length === 0) {
    const assistantText = getAssistantText(response);

    if (assistantText) {
      console.log(`\nAssistant: ${assistantText}`);
    }

    return currentResponseId;
  }

  const toolOutputs: Array<Record<string, unknown>> = [];

  for (const functionCall of functionCalls) {
    const toolArguments = parseToolArguments(functionCall.arguments);
    const toolRun = await runner.runTool(functionCall.name ?? '', toolArguments);

    printToolRun(userMessage, toolRun);
    toolOutputs.push({
      type: 'function_call_output',
      call_id: functionCall.call_id,
      output: JSON.stringify(toolRun.rawToolResponse),
    });
  }

  const finalResponse = await client.createResponse({
    input: toolOutputs,
    previousResponseId: currentResponseId,
    tools: openAIFunctionTools,
  });
  currentResponseId = finalResponse.id;

  const assistantText = getAssistantText(finalResponse);

  if (assistantText) {
    console.log(`\nAssistant: ${assistantText}`);
  }

  return currentResponseId;
}

async function main(): Promise<void> {
  const client = new OpenAIClient();
  const runner = new DevelopmentToolRunner();
  let previousResponseId: string | undefined;

  console.log('Maju Conversation Playground');
  console.log('Type a message and press enter. Type /exit to quit.');

  previousResponseId = await runOpenAITurn(
    client,
    runner,
    'Start the Maju conversation by calling startConversation.',
    previousResponseId,
  );

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      let userMessage: string;

      try {
        userMessage = await rl.question('\nYou: ');
      } catch (error) {
        if (error instanceof Error && error.message === 'readline was closed') {
          break;
        }

        throw error;
      }

      if (userMessage.trim() === '/exit') {
        break;
      }

      previousResponseId = await runOpenAITurn(
        client,
        runner,
        userMessage,
        previousResponseId,
      );
    }
  } finally {
    rl.close();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
