import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ConversationAnalysis } from '../openai/conversation-analyzer';

export const openingScenarios = [
  'Meal',
  'Sleep',
  'Exercise',
  'Weekend',
  'Hobby',
  'Weather',
  'Work',
  'Emotion',
] as const;

export type OpeningScenario = (typeof openingScenarios)[number];

export type SessionMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  turnIndex: number;
};

export type ConversationAnalysisTimelineItem = {
  turnIndex: number;
  userMessageId: string;
  createdAt: string;
  analysis: ConversationAnalysis;
};

export type ConversationSummary = {
  OpeningScenario: OpeningScenario;
  MainCategory: string | null;
  VisitedTopics: string[];
  EmotionTimeline: Array<{
    turnIndex: number;
    emotion: string;
  }>;
  ProfileCandidates: Record<string, string[]>;
  MemoryCandidates: string[];
  NeedExternalInformationCount: number;
};

export type ConversationSessionSnapshot = {
  SessionId: string;
  StartedAt: string;
  EndedAt: string | null;
  OpeningScenario: OpeningScenario;
  CurrentTurn: number;
  TurnCount: number;
  ConversationState: unknown;
  ConversationSummary: ConversationSummary;
};

export type ConversationSessionReport = {
  SchemaVersion: 1;
  Session: {
    SessionId: string;
    StartedAt: string;
    EndedAt: string;
    OpeningScenario: OpeningScenario;
    TurnCount: number;
    Messages: SessionMessage[];
    ConversationAnalysisTimeline: ConversationAnalysisTimelineItem[];
    ConversationSummary: ConversationSummary;
  };
  Replay: {
    initialRequest: {
      openingScenario: OpeningScenario;
    };
    turns: Array<{
      turnIndex: number;
      userMessage: string;
      assistantMessage: string | null;
      analysis: ConversationAnalysis | null;
    }>;
  };
};

type ActiveConversationSession = {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  openingScenario: OpeningScenario;
  turnCount: number;
  messages: SessionMessage[];
  analysisTimeline: ConversationAnalysisTimelineItem[];
  conversationState: unknown;
};

export type EndSessionResult = {
  session: ConversationSessionSnapshot | null;
  report: ConversationSessionReport | null;
  reportPath: string | null;
};

function chooseOpeningScenario(): OpeningScenario {
  const index = Math.floor(Math.random() * openingScenarios.length);

  return openingScenarios[index];
}

function createMessage(
  role: SessionMessage['role'],
  content: string,
  turnIndex: number,
): SessionMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    turnIndex,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function collectProfileCandidates(
  timeline: ConversationAnalysisTimelineItem[],
): Record<string, string[]> {
  const candidates: Record<string, string[]> = {
    Interests: [],
    Lifestyle: [],
    ConversationStyle: [],
    Health: [],
    Occupation: [],
  };

  for (const item of timeline) {
    for (const [key, values] of Object.entries(item.analysis.ProfileSignals)) {
      candidates[key] = unique([...(candidates[key] ?? []), ...values]);
    }
  }

  return candidates;
}

function collectMemoryCandidates(
  timeline: ConversationAnalysisTimelineItem[],
): string[] {
  const candidates: string[] = [];

  for (const item of timeline) {
    const signals = item.analysis.MemorySignals;

    for (const key of ['MealSkipped', 'SleepIssue', 'HousingConcern', 'BackPain']) {
      const signal = signals[key as keyof typeof signals];

      if (
        typeof signal === 'object' &&
        signal !== null &&
        'detected' in signal &&
        signal.detected
      ) {
        candidates.push(key);
      }
    }

    candidates.push(...signals.OtherSignals);
  }

  return unique(candidates);
}

function getMainCategory(
  timeline: ConversationAnalysisTimelineItem[],
): string | null {
  const counts = new Map<string, number>();

  for (const item of timeline) {
    const category = item.analysis.Category;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return (
    Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ??
    null
  );
}

function buildSummary(session: ActiveConversationSession): ConversationSummary {
  return {
    OpeningScenario: session.openingScenario,
    MainCategory: getMainCategory(session.analysisTimeline),
    VisitedTopics: unique(
      session.analysisTimeline.map((item) => item.analysis.Topic),
    ),
    EmotionTimeline: session.analysisTimeline.map((item) => ({
      turnIndex: item.turnIndex,
      emotion: item.analysis.Emotion,
    })),
    ProfileCandidates: collectProfileCandidates(session.analysisTimeline),
    MemoryCandidates: collectMemoryCandidates(session.analysisTimeline),
    NeedExternalInformationCount: session.analysisTimeline.filter(
      (item) => item.analysis.NeedExternalInformation,
    ).length,
  };
}

function buildReplayTurns(
  session: ActiveConversationSession,
): ConversationSessionReport['Replay']['turns'] {
  return session.messages
    .filter((message) => message.role === 'user')
    .map((userMessage) => {
      const assistantMessage = session.messages.find(
        (message) =>
          message.role === 'assistant' &&
          message.turnIndex === userMessage.turnIndex &&
          message.createdAt > userMessage.createdAt,
      );
      const timelineItem = session.analysisTimeline.find(
        (item) => item.turnIndex === userMessage.turnIndex,
      );

      return {
        turnIndex: userMessage.turnIndex,
        userMessage: userMessage.content,
        assistantMessage: assistantMessage?.content ?? null,
        analysis: timelineItem?.analysis ?? null,
      };
    });
}

function getReportPath(session: ActiveConversationSession): string {
  const date = session.startedAt.slice(0, 10);

  return join(
    process.cwd(),
    'conversation-history',
    date,
    `${session.sessionId}.json`,
  );
}

export class ConversationSessionRecorder {
  private activeSession: ActiveConversationSession | null = null;

  startSession(): ConversationSessionSnapshot {
    const startedAt = new Date().toISOString();

    this.activeSession = {
      sessionId: randomUUID(),
      startedAt,
      endedAt: null,
      openingScenario: chooseOpeningScenario(),
      turnCount: 0,
      messages: [],
      analysisTimeline: [],
      conversationState: null,
    };

    return this.getSessionSnapshot();
  }

  hasActiveSession(): boolean {
    return this.activeSession !== null;
  }

  getSessionSnapshot(): ConversationSessionSnapshot {
    if (!this.activeSession) {
      throw new Error('Conversation session has not started.');
    }

    return {
      SessionId: this.activeSession.sessionId,
      StartedAt: this.activeSession.startedAt,
      EndedAt: this.activeSession.endedAt,
      OpeningScenario: this.activeSession.openingScenario,
      CurrentTurn: this.activeSession.turnCount,
      TurnCount: this.activeSession.turnCount,
      ConversationState: this.activeSession.conversationState,
      ConversationSummary: buildSummary(this.activeSession),
    };
  }

  getMessagesForAnalyzer(): Array<Pick<SessionMessage, 'role' | 'content'>> {
    return (this.activeSession?.messages ?? []).map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  appendAssistantMessage(content: string): SessionMessage {
    if (!this.activeSession) {
      throw new Error('Conversation session has not started.');
    }

    const message = createMessage(
      'assistant',
      content,
      this.activeSession.turnCount,
    );
    this.activeSession.messages.push(message);

    return message;
  }

  beginUserTurn(content: string): SessionMessage {
    if (!this.activeSession) {
      throw new Error('Conversation session has not started.');
    }

    this.activeSession.turnCount += 1;
    const message = createMessage('user', content, this.activeSession.turnCount);
    this.activeSession.messages.push(message);

    return message;
  }

  appendAnalysis(
    userMessageId: string,
    analysis: ConversationAnalysis,
  ): ConversationAnalysisTimelineItem {
    if (!this.activeSession) {
      throw new Error('Conversation session has not started.');
    }

    const item = {
      turnIndex: this.activeSession.turnCount,
      userMessageId,
      createdAt: new Date().toISOString(),
      analysis,
    };
    this.activeSession.analysisTimeline.push(item);

    return item;
  }

  setConversationState(conversationState: unknown): void {
    if (this.activeSession) {
      this.activeSession.conversationState = conversationState;
    }
  }

  async endSession(): Promise<EndSessionResult> {
    if (!this.activeSession) {
      return {
        session: null,
        report: null,
        reportPath: null,
      };
    }

    this.activeSession.endedAt = new Date().toISOString();
    const report = this.buildReport(this.activeSession);
    const reportPath = getReportPath(this.activeSession);

    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const session = this.getSessionSnapshot();
    this.activeSession = null;

    return {
      session,
      report,
      reportPath,
    };
  }

  private buildReport(
    session: ActiveConversationSession,
  ): ConversationSessionReport {
    const endedAt = session.endedAt ?? new Date().toISOString();
    const summary = buildSummary(session);

    return {
      SchemaVersion: 1,
      Session: {
        SessionId: session.sessionId,
        StartedAt: session.startedAt,
        EndedAt: endedAt,
        OpeningScenario: session.openingScenario,
        TurnCount: session.turnCount,
        Messages: session.messages,
        ConversationAnalysisTimeline: session.analysisTimeline,
        ConversationSummary: summary,
      },
      Replay: {
        initialRequest: {
          openingScenario: session.openingScenario,
        },
        turns: buildReplayTurns(session),
      },
    };
  }
}
