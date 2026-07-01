import { Injectable } from '@nestjs/common';
import {
  ConversationAnalysis,
  ConversationAnalyzer,
} from '../openai/conversation-analyzer';
import { DevelopmentConversationTurnRunner } from '../openai/conversation-turn-runner';
import { OpenAIClient } from '../openai/openai-client';
import { DevelopmentToolRunner } from '../openai/tool-runner';

type PlaygroundTurn = Awaited<
  ReturnType<DevelopmentConversationTurnRunner['runTurn']>
> & {
  conversationAnalysis: ConversationAnalysis | null;
};

type SessionMessage = {
  role: 'assistant' | 'user';
  content: string;
};

@Injectable()
export class DevelopmentPlaygroundService {
  private readonly openAIClient = new OpenAIClient();
  private readonly turnRunner = new DevelopmentConversationTurnRunner(
    this.openAIClient,
    new DevelopmentToolRunner(),
  );
  private readonly analyzer = new ConversationAnalyzer(this.openAIClient);
  private readonly sessionMessages: SessionMessage[] = [];
  private previousResponseId?: string;

  async startConversation(): Promise<PlaygroundTurn> {
    this.previousResponseId = undefined;
    this.sessionMessages.length = 0;
    const turn = await this.turnRunner.runTurn(
      'Start the Maju conversation by calling startConversation.',
    );
    this.previousResponseId = turn.responseId;
    this.sessionMessages.push({
      role: 'assistant',
      content: turn.assistantMessage,
    });

    return {
      ...turn,
      conversationAnalysis: null,
    };
  }

  async continueConversation(message: string): Promise<PlaygroundTurn> {
    const conversationSession = {
      previousResponseId: this.previousResponseId ?? null,
      messages: this.sessionMessages,
    };
    const conversationAnalysis = await this.analyzer.analyze({
      userMessage: message,
      conversationSession,
      profile: {},
      memory: {},
    });
    const turn = await this.turnRunner.runTurn(message, this.previousResponseId);
    this.previousResponseId = turn.responseId;
    this.sessionMessages.push(
      {
        role: 'user',
        content: message,
      },
      {
        role: 'assistant',
        content: turn.assistantMessage,
      },
    );

    return {
      ...turn,
      conversationAnalysis,
    };
  }
}
