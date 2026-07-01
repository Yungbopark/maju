import { Injectable } from '@nestjs/common';

export interface StartConversationResult {
  [key: string]: unknown;
  assistantOpening: string;
  openingScenario: {
    id: string;
    category: string;
  };
  conversationIntent: 'DAILY_CHECK_IN';
  conversationState: 'OPENING';
  nextAction: 'WAIT_USER_RESPONSE';
}

export type OpeningScenarioInput = {
  id: string;
  category: string;
  openingMessage: string;
};

export interface ContinueConversationResult {
  [key: string]: unknown;
  assistantReply: string;
  conversationIntent: 'MEAL_FOLLOW_UP' | 'MEAL_CARE' | 'DAILY_CHECK_IN';
  conversationState: 'FOLLOW_UP' | 'CARE_SUGGESTION';
  nextAction: 'WAIT_USER_RESPONSE';
}

export type ConversationContextState =
  | StartConversationResult['conversationState']
  | ContinueConversationResult['conversationState'];

export interface ConversationContext {
  lastConversationState: ConversationContextState;
  lastAssistantReply: string;
  lastUserMessage: string | null;
  updatedAt: string;
}

export interface ConversationContextResult {
  [key: string]: unknown;
  subject: string | null;
  conversationExists: boolean;
  conversationState: ConversationContextState | null;
  lastUserMessage: string | null;
  lastAssistantReply: string | null;
  updatedAt: string | null;
}

@Injectable()
export class ConversationService {
  private readonly conversationContexts = new Map<string, ConversationContext>();

  startConversation(
    openAISubject?: string | null,
    openingScenario?: OpeningScenarioInput | null,
  ): StartConversationResult {
    const conversation: StartConversationResult = {
      assistantOpening:
        openingScenario?.openingMessage ??
        '안녕하세요. 😊 오늘 비가 오는데 점심은 드셨나요?',
      openingScenario: {
        id: openingScenario?.id ?? 'FALLBACK_DAILY_CHECK',
        category: openingScenario?.category ?? 'DailyLife',
      },
      conversationIntent: 'DAILY_CHECK_IN',
      conversationState: 'OPENING',
      nextAction: 'WAIT_USER_RESPONSE',
    };

    if (openAISubject) {
      this.conversationContexts.set(openAISubject, {
        lastConversationState: conversation.conversationState,
        lastAssistantReply: conversation.assistantOpening,
        lastUserMessage: null,
        updatedAt: new Date().toISOString(),
      });
    }

    return conversation;
  }

  continueConversation(
    userMessage: string,
    openAISubject?: string | null,
  ): ContinueConversationResult {
    const previousContext = openAISubject
      ? this.conversationContexts.get(openAISubject)
      : undefined;
    const conversation = this.buildContinueConversation(
      userMessage,
      previousContext,
    );

    if (openAISubject) {
      this.conversationContexts.set(openAISubject, {
        lastConversationState: conversation.conversationState,
        lastAssistantReply: conversation.assistantReply,
        lastUserMessage: userMessage,
        updatedAt: new Date().toISOString(),
      });
    }

    return conversation;
  }

  getConversationContext(
    openAISubject?: string | null,
  ): ConversationContextResult {
    if (!openAISubject) {
      return {
        subject: null,
        conversationExists: false,
        conversationState: null,
        lastUserMessage: null,
        lastAssistantReply: null,
        updatedAt: null,
      };
    }

    const context = this.conversationContexts.get(openAISubject);

    return {
      subject: openAISubject,
      conversationExists: context !== undefined,
      conversationState: context?.lastConversationState ?? null,
      lastUserMessage: context?.lastUserMessage ?? null,
      lastAssistantReply: context?.lastAssistantReply ?? null,
      updatedAt: context?.updatedAt ?? null,
    };
  }

  private buildContinueConversation(
    userMessage: string,
    previousContext?: ConversationContext,
  ): ContinueConversationResult {
    if (
      userMessage.includes('아니') ||
      userMessage.includes('안 먹') ||
      userMessage.includes('못 먹')
    ) {
      return {
        assistantReply:
          '아직 못 드셨군요. 너무 늦지 않게 가볍게라도 챙겨 드시면 좋겠어요.',
        conversationIntent: 'MEAL_CARE',
        conversationState: 'CARE_SUGGESTION',
        nextAction: 'WAIT_USER_RESPONSE',
      };
    }

    if (previousContext?.lastConversationState === 'FOLLOW_UP') {
      return {
        assistantReply:
          '이전 대화에 이어서 들었어요. 오늘 식사는 그렇게 기억해둘게요.',
        conversationIntent: 'MEAL_FOLLOW_UP',
        conversationState: 'FOLLOW_UP',
        nextAction: 'WAIT_USER_RESPONSE',
      };
    }

    if (
      userMessage.includes('먹') ||
      userMessage.includes('점심') ||
      userMessage.includes('식사')
    ) {
      return {
        assistantReply: '좋네요. 오늘은 무엇을 드셨어요?',
        conversationIntent: 'MEAL_FOLLOW_UP',
        conversationState: 'FOLLOW_UP',
        nextAction: 'WAIT_USER_RESPONSE',
      };
    }

    return {
      assistantReply: '그렇군요. 오늘 컨디션은 어떠세요?',
      conversationIntent: 'DAILY_CHECK_IN',
      conversationState: 'FOLLOW_UP',
      nextAction: 'WAIT_USER_RESPONSE',
    };
  }
}
