import { OpenAIClient, OpenAIResponse } from './openai-client';

export type ConversationFocus = {
  Category: 'Hobby';
  Topic: 'Vibe Coding';
  RemainingUserTurns: number;
};

export type FocusContinuityMessage = {
  role: 'assistant' | 'user';
  content: string;
};

export type FocusContinuityEvaluation = {
  focusMaintained: boolean;
  topicDriftDetected: boolean;
  driftTerms: string[];
  completedUserTurns: number;
  notes: string[];
};

export type FocusContinuityTurn = {
  currentFocus: ConversationFocus;
  remainingUserTurns: number;
  generatedSystemPrompt: string;
  openAIResponse: OpenAIResponse;
  assistantResponse: string;
  evaluation: FocusContinuityEvaluation;
};

const MAX_USER_TURNS = 5;
const OPENING_MESSAGE = '요즘 즐겁게 하고 있는 일이 있으세요?';
const DRIFT_TERMS = [
  '식사',
  '점심',
  '저녁',
  '아침',
  '컨디션',
  '운동',
  '날씨',
  '잠',
  '수면',
];

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

function createFocus(completedUserTurns: number): ConversationFocus {
  return {
    Category: 'Hobby',
    Topic: 'Vibe Coding',
    RemainingUserTurns: Math.max(0, MAX_USER_TURNS - completedUserTurns),
  };
}

export function createFocusContinuityPrompt(
  focus: ConversationFocus,
  messages: FocusContinuityMessage[],
): string {
  return [
    'You are running Experiment 007: LLM Focus Continuity Validation for Maju.',
    '',
    'Current Focus:',
    `Category: ${focus.Category}`,
    `Topic: ${focus.Topic}`,
    `RemainingUserTurns: ${focus.RemainingUserTurns}`,
    '',
    'Rules:',
    '1. Maintain the current Focus.',
    '2. Until RemainingUserTurns reaches 0, do not switch to another Topic.',
    "3. Generate one natural follow-up question based on the user's latest answer.",
    '4. Do not start a new topic.',
    '5. Do not jump to health, meals, weather, exercise, sleep, work, or general condition checks.',
    '6. Do not ask what the user likes as a hobby because the focus is already Vibe Coding.',
    '7. Stay inside the Vibe Coding topic and deepen the conversation naturally.',
    '8. Keep the response concise and conversational in Korean.',
    '',
    'Good exploration targets inside the Focus:',
    '- why Vibe Coding is fun',
    '- how long the user has been learning it',
    '- what project they are making',
    '- what feels difficult',
    '- what feels most enjoyable',
    '- what they want to build next',
    '',
    'Forbidden questions:',
    '- 오늘 식사는?',
    '- 컨디션은?',
    '- 운동은?',
    '- 취미가 뭐예요?',
    '',
    'Conversation so far:',
    JSON.stringify(messages, null, 2),
  ].join('\n');
}

function evaluateResponse(
  assistantResponse: string,
  completedUserTurns: number,
): FocusContinuityEvaluation {
  const driftTerms = DRIFT_TERMS.filter((term) =>
    assistantResponse.includes(term),
  );
  const topicMentioned =
    assistantResponse.includes('바이브') ||
    assistantResponse.toLowerCase().includes('vibe') ||
    assistantResponse.includes('코딩') ||
    assistantResponse.includes('프로젝트') ||
    assistantResponse.includes('만들') ||
    assistantResponse.includes('배우');

  return {
    focusMaintained: driftTerms.length === 0 && topicMentioned,
    topicDriftDetected: driftTerms.length > 0,
    driftTerms,
    completedUserTurns,
    notes: [
      topicMentioned
        ? 'Response stayed semantically close to Vibe Coding.'
        : 'Response did not explicitly mention a Vibe Coding related concept.',
      driftTerms.length === 0
        ? 'No forbidden drift terms were detected.'
        : `Forbidden drift terms detected: ${driftTerms.join(', ')}`,
    ],
  };
}

export class FocusContinuityExperiment {
  private messages: FocusContinuityMessage[] = [
    {
      role: 'assistant',
      content: OPENING_MESSAGE,
    },
  ];
  private previousResponseId?: string;
  private completedUserTurns = 0;

  constructor(private readonly client: OpenAIClient) {}

  start() {
    this.messages = [
      {
        role: 'assistant',
        content: OPENING_MESSAGE,
      },
    ];
    this.previousResponseId = undefined;
    this.completedUserTurns = 0;
    const currentFocus = createFocus(this.completedUserTurns);

    return {
      assistantResponse: OPENING_MESSAGE,
      currentFocus,
      remainingUserTurns: currentFocus.RemainingUserTurns,
      generatedSystemPrompt: createFocusContinuityPrompt(
        currentFocus,
        this.messages,
      ),
      messages: this.messages,
      evaluation: {
        focusMaintained: true,
        topicDriftDetected: false,
        driftTerms: [],
        completedUserTurns: this.completedUserTurns,
        notes: ['Experiment started with a fixed Hobby / Vibe Coding focus.'],
      },
    };
  }

  async continue(userMessage: string): Promise<FocusContinuityTurn> {
    this.completedUserTurns = Math.min(
      MAX_USER_TURNS,
      this.completedUserTurns + 1,
    );
    this.messages.push({
      role: 'user',
      content: userMessage,
    });
    const currentFocus = createFocus(this.completedUserTurns);
    const generatedSystemPrompt = createFocusContinuityPrompt(
      currentFocus,
      this.messages,
    );
    const openAIResponse = await this.client.createTextResponse({
      instructions: generatedSystemPrompt,
      input: userMessage,
      previousResponseId: this.previousResponseId,
    });
    this.previousResponseId = openAIResponse.id;
    const assistantResponse = getOutputText(openAIResponse);
    this.messages.push({
      role: 'assistant',
      content: assistantResponse,
    });

    return {
      currentFocus,
      remainingUserTurns: currentFocus.RemainingUserTurns,
      generatedSystemPrompt,
      openAIResponse,
      assistantResponse,
      evaluation: evaluateResponse(
        assistantResponse,
        this.completedUserTurns,
      ),
    };
  }
}
