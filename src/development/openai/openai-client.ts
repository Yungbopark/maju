import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type OpenAIToolDefinition = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
};

export type OpenAIResponseOutputItem = {
  id?: string;
  type?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  content?: Array<{ type?: string; text?: string }>;
};

export type OpenAIResponse = {
  id: string;
  output?: OpenAIResponseOutputItem[];
  output_text?: string;
};

export type CreateResponseInput = {
  input: string | Array<Record<string, unknown>>;
  previousResponseId?: string;
  tools: OpenAIToolDefinition[];
};

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1-mini';

function parseEnvLocal(): Record<string, string> {
  const envLocalPath = join(process.cwd(), '.env.local');

  if (!existsSync(envLocalPath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(envLocalPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');

        if (separatorIndex === -1) {
          return [line, ''];
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();

        return [key, value.replace(/^["']|["']$/g, '')];
      }),
  );
}

export class OpenAIClient {
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const env = parseEnvLocal();
    this.apiKey = env.OPENAI_API_KEY ?? '';
    this.model = env.OPENAI_MODEL || DEFAULT_MODEL;

    if (!this.apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required in .env.local for the development playground.',
      );
    }
  }

  async createResponse(input: CreateResponseInput): Promise<OpenAIResponse> {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        instructions:
          'You are the Maju development playground. Always use the provided tools to operate the conversation engine. Use startConversation to begin, continueConversation for user replies, getConversationContext to inspect continuity, and getRequestContext only when request context is asked for.',
        input: input.input,
        previous_response_id: input.previousResponseId,
        tools: input.tools,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API request failed: ${response.status} ${errorBody}`);
    }

    return (await response.json()) as OpenAIResponse;
  }
}
