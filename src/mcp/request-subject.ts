import {
  MajuRequestHeaders,
  mcpRequestContext,
} from './tool-invocation-trace';

const OPENAI_SUBJECT_HEADER = 'x-openai-subject';

function getHeader(
  headers: MajuRequestHeaders,
  name: string,
): string | string[] | undefined {
  const headerName = name.toLowerCase();
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === headerName,
  );

  return entry?.[1];
}

function normalizeHeaderValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function getOpenAISubjectFromRequest(): string | null {
  const requestContext = mcpRequestContext.getStore();

  return normalizeHeaderValue(
    requestContext
      ? getHeader(requestContext.headers, OPENAI_SUBJECT_HEADER)
      : undefined,
  );
}
