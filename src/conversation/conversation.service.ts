import { Injectable } from '@nestjs/common';

export interface StartConversationResult {
  [key: string]: unknown;
  assistantOpening: string;
  conversationIntent: 'DAILY_CHECK_IN';
  conversationState: 'OPENING';
  nextAction: 'WAIT_USER_RESPONSE';
}

export interface ContinueConversationResult {
  [key: string]: unknown;
  assistantReply: string;
  conversationIntent: 'MEAL_FOLLOW_UP' | 'MEAL_CARE' | 'DAILY_CHECK_IN';
  conversationState: 'FOLLOW_UP' | 'CARE_SUGGESTION';
  nextAction: 'WAIT_USER_RESPONSE';
}

@Injectable()
export class ConversationService {
  startConversation(): StartConversationResult {
    return {
      assistantOpening: '안녕하세요. 😊 오늘 비가 오는데 점심은 드셨나요?',
      conversationIntent: 'DAILY_CHECK_IN',
      conversationState: 'OPENING',
      nextAction: 'WAIT_USER_RESPONSE',
    };
  }

  continueConversation(userMessage: string): ContinueConversationResult {
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
