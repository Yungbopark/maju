import { Injectable } from '@nestjs/common';
import {
  ConversationAnalysis,
  ConversationAnalyzer,
} from '../openai/conversation-analyzer';
import { DevelopmentConversationTurnRunner } from '../openai/conversation-turn-runner';
import { OpenAIClient } from '../openai/openai-client';
import { DevelopmentToolRunner } from '../openai/tool-runner';
import {
  ConversationSessionRecorder,
  ConversationSessionSnapshot,
  EndSessionResult,
} from './conversation-session-recorder';

type PlaygroundTurn = Awaited<
  ReturnType<DevelopmentConversationTurnRunner['runTurn']>
> & {
  conversationAnalysis: ConversationAnalysis | null;
  session: ConversationSessionSnapshot;
  closedSessionReportPath?: string | null;
};

@Injectable()
export class DevelopmentPlaygroundService {
  private readonly openAIClient = new OpenAIClient();
  private readonly turnRunner = new DevelopmentConversationTurnRunner(
    this.openAIClient,
    new DevelopmentToolRunner(),
  );
  private readonly analyzer = new ConversationAnalyzer(this.openAIClient);
  private readonly sessionRecorder = new ConversationSessionRecorder();
  private previousResponseId?: string;

  async startConversation(): Promise<PlaygroundTurn> {
    let closedSessionReportPath: string | null = null;

    if (this.sessionRecorder.hasActiveSession()) {
      const endedSession = await this.sessionRecorder.endSession();
      closedSessionReportPath = endedSession.reportPath;
    }

    this.previousResponseId = undefined;
    const session = this.sessionRecorder.startSession();
    const turn = await this.turnRunner.runTurn(
      `Start the Maju conversation by calling startConversation. OpeningScenario: ${session.OpeningScenario}.`,
    );
    this.previousResponseId = turn.responseId;
    this.sessionRecorder.appendAssistantMessage(turn.assistantMessage);
    this.sessionRecorder.setConversationState(turn.conversationState);

    return {
      ...turn,
      conversationAnalysis: null,
      session: this.sessionRecorder.getSessionSnapshot(),
      closedSessionReportPath,
    };
  }

  async continueConversation(message: string): Promise<PlaygroundTurn> {
    if (!this.sessionRecorder.hasActiveSession()) {
      await this.startConversation();
    }

    const userMessage = this.sessionRecorder.beginUserTurn(message);
    const conversationSession = {
      previousResponseId: this.previousResponseId ?? null,
      session: this.sessionRecorder.getSessionSnapshot(),
      messages: this.sessionRecorder.getMessagesForAnalyzer(),
    };
    const conversationAnalysis = await this.analyzer.analyze({
      userMessage: message,
      conversationSession,
      profile: {},
      memory: {},
    });
    const turn = await this.turnRunner.runTurn(message, this.previousResponseId);
    this.previousResponseId = turn.responseId;
    this.sessionRecorder.appendAnalysis(userMessage.id, conversationAnalysis);
    this.sessionRecorder.appendAssistantMessage(turn.assistantMessage);
    this.sessionRecorder.setConversationState(turn.conversationState);

    return {
      ...turn,
      conversationAnalysis,
      session: this.sessionRecorder.getSessionSnapshot(),
    };
  }

  async endConversationSession(): Promise<EndSessionResult> {
    this.previousResponseId = undefined;

    return this.sessionRecorder.endSession();
  }
}
