import { Injectable } from '@nestjs/common';
import { DevelopmentConversationTurnRunner } from '../openai/conversation-turn-runner';
import { OpenAIClient } from '../openai/openai-client';
import { DevelopmentToolRunner } from '../openai/tool-runner';

@Injectable()
export class DevelopmentPlaygroundService {
  private readonly turnRunner = new DevelopmentConversationTurnRunner(
    new OpenAIClient(),
    new DevelopmentToolRunner(),
  );
  private previousResponseId?: string;

  async startConversation() {
    this.previousResponseId = undefined;
    const turn = await this.turnRunner.runTurn(
      'Start the Maju conversation by calling startConversation.',
    );
    this.previousResponseId = turn.responseId;

    return turn;
  }

  async continueConversation(message: string) {
    const turn = await this.turnRunner.runTurn(message, this.previousResponseId);
    this.previousResponseId = turn.responseId;

    return turn;
  }
}
