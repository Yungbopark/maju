import { z } from 'zod';
import {
  OpenAIClient,
  OpenAIResponse,
  OpenAIJsonSchemaFormat,
} from './openai-client';

const conversationCategories = [
  'DailyLife',
  'Meal',
  'Health',
  'Work',
  'Housing',
  'Hobby',
  'Travel',
  'Finance',
  'Family',
  'Unknown',
] as const;

const conversationIntents = [
  'Information',
  'EmotionalSupport',
  'SmallTalk',
  'Planning',
  'Recommendation',
  'Unknown',
] as const;

const conversationEmotions = [
  'Positive',
  'Neutral',
  'Concern',
  'Sad',
  'Happy',
  'Angry',
  'Anxiety',
  'Negative',
  'Unknown',
] as const;

export const CONVERSATION_ANALYZER_PROMPT = [
  'You are the Maju Conversation Analyzer.',
  'Your only responsibility is to analyze what happened in the user message and current conversation context.',
  'Do not create conversation goals.',
  'Do not create candidate actions.',
  'Do not decide what the assistant should do next.',
  'Do not call APIs, tools, or external services.',
  'Do not generate an assistant reply.',
  'Return only the structured ConversationAnalysis JSON that matches the schema.',
  'Classify Category, Topic, Intent, Emotion, confidence, missing information, need for external information, profile signal candidates, and memory signal candidates.',
  'ProfileSignals and MemorySignals are candidates only. They must not imply saving, updating, or calling any downstream system.',
  'Use Unknown, empty arrays, or false when the evidence is insufficient.',
  'For housing price worry, use Category Housing, Topic HousePriceConcern, Emotion Concern, and MemorySignals.HousingConcern true.',
  'For skipped meals, use Category Meal, Topic SkippedMeal, Emotion Negative, and MemorySignals.MealSkipped true.',
  'For poor sleep, use Category Health, Topic Sleep, and MemorySignals.SleepIssue true.',
  'For camping preference, use Category Hobby, Topic Camping, and ProfileSignals.Interests ["Camping"].',
].join('\n');

const memorySignalCandidateSchema = z.object({
  detected: z.boolean(),
  confidence: z.number().min(0).max(1),
});

const profileSignalsSchema = z.object({
  Interests: z.array(z.string()),
  Lifestyle: z.array(z.string()),
  ConversationStyle: z.array(z.string()),
  Health: z.array(z.string()),
  Occupation: z.array(z.string()),
});

const memorySignalsSchema = z.object({
  MealSkipped: memorySignalCandidateSchema,
  SleepIssue: memorySignalCandidateSchema,
  HousingConcern: memorySignalCandidateSchema,
  BackPain: memorySignalCandidateSchema,
  OtherSignals: z.array(z.string()),
});

export const conversationAnalysisSchema = z.object({
  Category: z.enum(conversationCategories),
  Topic: z.string(),
  Intent: z.enum(conversationIntents),
  Emotion: z.enum(conversationEmotions),
  Confidence: z.number().min(0).max(1),
  MissingInformation: z.array(z.string()),
  NeedExternalInformation: z.boolean(),
  ProfileSignals: profileSignalsSchema,
  MemorySignals: memorySignalsSchema,
});

export type ConversationAnalysis = z.infer<typeof conversationAnalysisSchema>;

export type ConversationAnalyzerInput = {
  userMessage: string;
  conversationSession: Record<string, unknown>;
  profile: Record<string, unknown>;
  memory: Record<string, unknown>;
};

export const conversationAnalysisJsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'Category',
    'Topic',
    'Intent',
    'Emotion',
    'Confidence',
    'MissingInformation',
    'NeedExternalInformation',
    'ProfileSignals',
    'MemorySignals',
  ],
  properties: {
    Category: {
      type: 'string',
      enum: conversationCategories,
    },
    Topic: {
      type: 'string',
      description:
        'Concise topic label such as HousePriceConcern, Moving, Mortgage, RegionSelection, SkippedMeal, Restaurant, Cooking, Sleep, Fatigue, BackPain, Camping, or General.',
    },
    Intent: {
      type: 'string',
      enum: conversationIntents,
    },
    Emotion: {
      type: 'string',
      enum: conversationEmotions,
    },
    Confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    MissingInformation: {
      type: 'array',
      items: { type: 'string' },
    },
    NeedExternalInformation: {
      type: 'boolean',
    },
    ProfileSignals: {
      type: 'object',
      additionalProperties: false,
      required: [
        'Interests',
        'Lifestyle',
        'ConversationStyle',
        'Health',
        'Occupation',
      ],
      properties: {
        Interests: {
          type: 'array',
          items: { type: 'string' },
        },
        Lifestyle: {
          type: 'array',
          items: { type: 'string' },
        },
        ConversationStyle: {
          type: 'array',
          items: { type: 'string' },
        },
        Health: {
          type: 'array',
          items: { type: 'string' },
        },
        Occupation: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    MemorySignals: {
      type: 'object',
      additionalProperties: false,
      required: [
        'HousingConcern',
        'MealSkipped',
        'SleepIssue',
        'BackPain',
        'OtherSignals',
      ],
      properties: {
        MealSkipped: {
          type: 'object',
          additionalProperties: false,
          required: ['detected', 'confidence'],
          properties: {
            detected: { type: 'boolean' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        SleepIssue: {
          type: 'object',
          additionalProperties: false,
          required: ['detected', 'confidence'],
          properties: {
            detected: { type: 'boolean' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        HousingConcern: {
          type: 'object',
          additionalProperties: false,
          required: ['detected', 'confidence'],
          properties: {
            detected: { type: 'boolean' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        BackPain: {
          type: 'object',
          additionalProperties: false,
          required: ['detected', 'confidence'],
          properties: {
            detected: { type: 'boolean' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        OtherSignals: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
};

const conversationAnalysisTextFormat: OpenAIJsonSchemaFormat = {
  type: 'json_schema',
  name: 'conversation_analysis',
  strict: true,
  schema: conversationAnalysisJsonSchema,
};

function getOutputText(response: OpenAIResponse): string {
  if (response.output_text) {
    return response.output_text;
  }

  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join('\n');
}

function createFallbackAnalysis(topic: string): ConversationAnalysis {
  return {
    Category: 'Unknown',
    Topic: topic || 'Unknown',
    Intent: 'Unknown',
    Emotion: 'Unknown',
    Confidence: 0,
    MissingInformation: ['Analyzer failed to produce valid structured output.'],
    NeedExternalInformation: false,
    ProfileSignals: {
      Interests: [],
      Lifestyle: [],
      ConversationStyle: [],
      Health: [],
      Occupation: [],
    },
    MemorySignals: {
      MealSkipped: { detected: false, confidence: 0 },
      SleepIssue: { detected: false, confidence: 0 },
      HousingConcern: { detected: false, confidence: 0 },
      BackPain: { detected: false, confidence: 0 },
      OtherSignals: [],
    },
  };
}

export class ConversationAnalyzer {
  constructor(private readonly client: OpenAIClient) {}

  async analyze(input: ConversationAnalyzerInput): Promise<ConversationAnalysis> {
    const userMessage = input.userMessage.trim();

    if (!userMessage) {
      return createFallbackAnalysis('EmptyMessage');
    }

    const response = await this.client.createStructuredResponse({
      instructions: CONVERSATION_ANALYZER_PROMPT,
      textFormat: conversationAnalysisTextFormat,
      input: JSON.stringify(
        {
          UserMessage: userMessage,
          ConversationSession: input.conversationSession,
          Profile: input.profile,
          Memory: input.memory,
        },
        null,
        2,
      ),
    });
    const parsed = JSON.parse(getOutputText(response)) as unknown;

    return conversationAnalysisSchema.parse(parsed);
  }
}
