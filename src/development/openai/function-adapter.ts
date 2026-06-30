import { OpenAIToolDefinition } from './openai-client';

const emptyObjectSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

export const openAIFunctionTools: OpenAIToolDefinition[] = [
  {
    type: 'function',
    name: 'getMajuStatus',
    description: 'Returns current Maju server status and project information.',
    parameters: emptyObjectSchema,
    strict: true,
  },
  {
    type: 'function',
    name: 'startConversation',
    description:
      'Starts the first Maju conversation with a daily check-in opening.',
    parameters: emptyObjectSchema,
    strict: true,
  },
  {
    type: 'function',
    name: 'continueConversation',
    description:
      "Continues a Maju conversation using the user's latest message.",
    parameters: {
      type: 'object',
      properties: {
        userMessage: {
          type: 'string',
          description: "The user's latest message in the conversation.",
        },
      },
      required: ['userMessage'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'getConversationContext',
    description:
      'Returns the temporary in-memory conversation context for the development subject.',
    parameters: emptyObjectSchema,
    strict: true,
  },
  {
    type: 'function',
    name: 'getRequestContext',
    description:
      'Returns the development request context used by the local playground.',
    parameters: emptyObjectSchema,
    strict: true,
  },
];
