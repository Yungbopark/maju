import { Injectable } from '@nestjs/common';

export interface StartConversationResult {
  [key: string]: unknown;
  assistantOpening: string;
  conversationIntent: 'DAILY_CHECK_IN';
  conversationState: 'OPENING';
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
}
