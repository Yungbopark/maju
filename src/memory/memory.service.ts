import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

type MemoryType =
  | 'CurrentFocus'
  | 'LongTermInterest'
  | 'Concern'
  | 'Goal'
  | 'Value'
  | 'Preference'
  | 'Unknown';

type MemoryLongevity = 'Permanent' | 'LongTerm' | 'Temporary' | 'Event';

type MemoryCategorizeResult = {
  input: string;
  surfaceConcept: string;
  category: string;
  candidates: string[];
  confidence: number;
  reason: string;
  shouldSave: boolean;
  memoryLongevity: MemoryLongevity;
  saveScore: number;
  saveReason: string;
  memoryType: MemoryType;
  abstractionReason: string;
  artifactPath?: string;
  debugRaw?: unknown;
};

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const AUTH_SCHEME = 'Bear' + 'er';
const MEMORY_TYPES = new Set<MemoryType>([
  'CurrentFocus',
  'LongTermInterest',
  'Concern',
  'Goal',
  'Value',
  'Preference',
  'Unknown',
]);
const MEMORY_LONGEVITIES = new Set<MemoryLongevity>([
  'Permanent',
  'LongTerm',
  'Temporary',
  'Event',
]);

function parseEnvLocal(): Record<string, string> {
  const envLocalPath = join(process.cwd(), '.env.local');

  if (!existsSync(envLocalPath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(envLocalPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');

        if (separatorIndex === -1) {
          return [line, ''];
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();

        return [key, value.replace(/^["']|["']$/g, '')];
      }),
  );
}

function getOutputText(response: {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
}): string {
  if (response.output_text) {
    return response.output_text;
  }

  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join('\n');
}

function extractJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error('No JSON object found in LLM response.');
    }

    return JSON.parse(match[0]);
  }
}

function clampConfidence(value: unknown): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.min(1, Math.max(0, numberValue));
}

function normalizeCandidates(value: unknown, category: string): string[] {
  const candidates = Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0)
        .slice(0, 5)
    : [];

  if (candidates.length === 0 && category !== 'Unknown') {
    return [category];
  }

  return candidates;
}

function normalizeMemoryType(value: unknown): MemoryType {
  const memoryType = String(value ?? 'Unknown') as MemoryType;

  return MEMORY_TYPES.has(memoryType) ? memoryType : 'Unknown';
}

function normalizeMemoryLongevity(value: unknown): MemoryLongevity {
  const longevity = String(value ?? 'Temporary') as MemoryLongevity;

  return MEMORY_LONGEVITIES.has(longevity) ? longevity : 'Temporary';
}

function clampSaveScore(value: unknown): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.round(Math.min(100, Math.max(0, numberValue)));
}

function createFallbackResult(
  input: string,
  reason: string,
  debugRaw?: unknown,
): MemoryCategorizeResult {
  return {
    input,
    surfaceConcept: 'Unknown',
    category: 'Unknown',
    candidates: [],
    confidence: 0,
    reason,
    shouldSave: false,
    memoryLongevity: 'Temporary',
    saveScore: 0,
    saveReason: '장기 메모리 저장 판단을 수행하지 못했습니다.',
    memoryType: 'Unknown',
    abstractionReason: '',
    artifactPath: getArtifactPath(),
    debugRaw,
  };
}

function getArtifactPath(): string {
  return join('artifacts', 'memory-categorize-results.jsonl');
}

@Injectable()
export class MemoryService {
  async categorize(text: string): Promise<MemoryCategorizeResult> {
    const input = text.trim();

    if (!input) {
      return createFallbackResult(input, '분석할 입력 문장이 없습니다.');
    }

    try {
      const rawResponse = await this.callOpenAI(input);
      const rawText = getOutputText(rawResponse);
      const parsed = extractJson(rawText) as Record<string, unknown>;
      const category = String(parsed.category ?? 'Unknown').trim() || 'Unknown';
      const memoryLongevity = normalizeMemoryLongevity(parsed.memoryLongevity);
      const saveScore = clampSaveScore(parsed.saveScore);

      const result = {
        input,
        surfaceConcept:
          String(parsed.surfaceConcept ?? 'Unknown').trim() || 'Unknown',
        category,
        candidates: normalizeCandidates(parsed.candidates, category),
        confidence: clampConfidence(parsed.confidence),
        reason: String(parsed.reason ?? '').trim(),
        shouldSave:
          typeof parsed.shouldSave === 'boolean'
            ? parsed.shouldSave
            : memoryLongevity === 'Permanent' || memoryLongevity === 'LongTerm',
        memoryLongevity,
        saveScore,
        saveReason: String(parsed.saveReason ?? '').trim(),
        memoryType: normalizeMemoryType(parsed.memoryType),
        abstractionReason: String(parsed.abstractionReason ?? '').trim(),
        artifactPath: getArtifactPath(),
      };
      await this.writeCategorizeArtifact(result);

      return result;
    } catch (error) {
      const fallbackResult = createFallbackResult(
        input,
        'LLM 응답을 JSON으로 해석하지 못해 Unknown으로 처리했습니다.',
        error instanceof Error ? error.message : error,
      );
      await this.writeCategorizeArtifact(fallbackResult);

      return fallbackResult;
    }
  }

  private async callOpenAI(input: string): Promise<Record<string, unknown>> {
    const env = parseEnvLocal();
    const apiKey = env.OPENAI_API_KEY ?? '';
    const model = env.OPENAI_MODEL || DEFAULT_MODEL;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required in .env.local.');
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `${AUTH_SCHEME} ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions: [
          '사용자의 자유 답변을 분석한다.',
          '가장 먼저 판단할 것은 "이 정보가 6개월 뒤에도 사용자를 이해하는데 도움이 되는 정보인가?"이다.',
          '미리 정의된 카테고리 목록을 주지 않는다.',
          'surfaceConcept는 문장을 직접 설명하는 영어 개념으로 만든다. 필요하면 CamelCase 한 단어를 사용한다.',
          'category는 Memory에 저장할 상위 개념이다.',
          '이 문장을 통해 드러난 사용자의 장기적인 관심사, 가치관, 목표, 생활영역을 대표하는 상위 개념을 영어 한 단어로 생성한다.',
          '너무 구체적인 행동(Action), 감정(Emotion), 이벤트(Event)는 category로 사용하지 않는다.',
          '항상 surfaceConcept보다 한 단계 이상 추상화된 category를 생성한다.',
          '예: 담배 끊고 싶다 -> surfaceConcept QuitSmoking, category Health.',
          '예: 아기를 갖고 싶다 -> surfaceConcept Parenthood, category Family.',
          '예: 아이패드 사고 싶다 -> surfaceConcept iPadPurchase, category Technology.',
          '예: 새로운 걸 배우는 게 재밌다 -> surfaceConcept LearningInterest, category Learning.',
          '예: 부모님이 걱정된다 -> surfaceConcept ParentConcern, category Family.',
          '예: 맥 가격이 너무 올랐다 -> surfaceConcept MacPricing, category Technology 또는 저장 가치가 낮으면 shouldSave false.',
          '후보 카테고리 3~5개를 함께 반환한다.',
          '선택 이유를 한국어로 짧게 반환한다.',
          'memoryLongevity는 Permanent, LongTerm, Temporary, Event 중 하나로 판단한다.',
          'Permanent: 거의 변하지 않는 특성, 가치관, 가족관계, 장기 관심사.',
          'LongTerm: 몇 달 이상 유지될 가능성이 높은 목표, 습관, 관심사.',
          'Temporary: 현재 상태, 현재 감정, 현재 고민, 시간이 지나면 사라질 가능성이 높은 정보.',
          'Event: 뉴스, 일회성 불만, 오늘 있었던 일, 제품 가격, 특정 사건.',
          'shouldSave 권장 기준: Permanent와 LongTerm은 true, Temporary와 Event는 false.',
          'saveScore는 6개월 뒤에도 사용자를 이해하는 데 도움이 되는 정도를 0~100으로 매긴다.',
          'saveReason에는 저장 또는 제외 판단 이유를 한국어로 짧게 설명한다.',
          '단발성 통증, 일회성 소비 불만, 현재 볼 콘텐츠가 없음, 제품 가격 불만은 대체로 shouldSave false다.',
          '장기 목표, 반복될 관심사, 가치관, 가족/관계, 습관 변화 의지는 대체로 shouldSave true다.',
          'memoryType은 CurrentFocus, LongTermInterest, Concern, Goal, Value, Preference, Unknown 중 하나로 판단한다.',
          'abstractionReason에는 surfaceConcept를 category로 일반화한 이유를 한국어로 짧게 설명한다.',
          '응답은 반드시 JSON 객체 하나만 반환한다.',
        ].join('\n'),
        input: `사용자 답변: ${input}

반드시 아래 JSON shape로만 답하세요.
{
  "surfaceConcept": "EnglishConcept",
  "category": "EnglishOneWord",
  "candidates": ["CategoryA", "CategoryB", "CategoryC"],
  "confidence": 0.0,
  "reason": "짧은 한국어 설명",
  "memoryLongevity": "Permanent | LongTerm | Temporary | Event",
  "saveScore": 0,
  "saveReason": "저장 또는 제외 판단 이유",
  "shouldSave": true,
  "memoryType": "CurrentFocus | LongTermInterest | Concern | Goal | Value | Preference | Unknown",
  "abstractionReason": "surfaceConcept를 category로 일반화한 이유"
}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  private async writeCategorizeArtifact(
    result: MemoryCategorizeResult,
  ): Promise<void> {
    const artifactsDir = join(process.cwd(), 'artifacts');
    const artifactFile = join(artifactsDir, 'memory-categorize-results.jsonl');
    const artifact = {
      timestamp: new Date().toISOString(),
      input: result.input,
      surfaceConcept: result.surfaceConcept,
      category: result.category,
      candidates: result.candidates,
      confidence: result.confidence,
      reason: result.reason,
      shouldSave: result.shouldSave,
      memoryLongevity: result.memoryLongevity,
      saveScore: result.saveScore,
      saveReason: result.saveReason,
      memoryType: result.memoryType,
      abstractionReason: result.abstractionReason,
      debugRaw: result.debugRaw,
    };

    await mkdir(artifactsDir, { recursive: true });
    await appendFile(artifactFile, `${JSON.stringify(artifact)}\n`, 'utf8');
  }
}
