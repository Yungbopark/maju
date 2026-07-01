import { Injectable } from '@nestjs/common';
import {
  ConversationAnalysis,
  ConversationAnalyzer,
} from '../openai/conversation-analyzer';
import { DevelopmentConversationTurnRunner } from '../openai/conversation-turn-runner';
import { FocusContinuityExperiment } from '../openai/focus-continuity-experiment';
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
  sessionId: string;
  openingScenario: {
    id: string;
    category: string;
  };
  assistantOpening: string | null;
  conversationAnalysis: ConversationAnalysis | null;
  session: ConversationSessionSnapshot;
  closedSessionReportPath?: string | null;
};

@Injectable()
export class DevelopmentPlaygroundService {
  private readonly openAIClient = new OpenAIClient();
  private readonly toolRunner = new DevelopmentToolRunner();
  private readonly turnRunner = new DevelopmentConversationTurnRunner(
    this.openAIClient,
    this.toolRunner,
  );
  private readonly analyzer = new ConversationAnalyzer(this.openAIClient);
  private readonly focusExperiment = new FocusContinuityExperiment(
    this.openAIClient,
  );
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
    this.toolRunner.setOpeningScenario(session.OpeningScenario);
    const turn = await this.turnRunner.runTurn(
      `Start the Maju conversation by calling startConversation. OpeningScenarioId: ${session.OpeningScenario.id}. OpeningScenarioCategory: ${session.OpeningScenario.category}.`,
    );
    const assistantOpening = turn.toolResult.assistantOpening
      ? String(turn.toolResult.assistantOpening)
      : turn.assistantMessage;
    this.previousResponseId = turn.responseId;
    this.sessionRecorder.appendAssistantMessage(assistantOpening);
    this.sessionRecorder.setConversationState(turn.conversationState);

    return {
      ...turn,
      assistantMessage: assistantOpening,
      sessionId: session.SessionId,
      openingScenario: {
        id: session.OpeningScenario.id,
        category: session.OpeningScenario.category,
      },
      assistantOpening,
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
    const currentSession = this.sessionRecorder.getSessionSnapshot();

    return {
      ...turn,
      sessionId: currentSession.SessionId,
      openingScenario: {
        id: currentSession.OpeningScenario.id,
        category: currentSession.OpeningScenario.category,
      },
      assistantOpening: currentSession.AssistantOpening || null,
      conversationAnalysis,
      session: currentSession,
    };
  }

  async endConversationSession(): Promise<EndSessionResult> {
    this.previousResponseId = undefined;

    return this.sessionRecorder.endSession();
  }

  startFocusContinuityExperiment() {
    return this.focusExperiment.start();
  }

  continueFocusContinuityExperiment(message: string) {
    return this.focusExperiment.continue(message);
  }
}
