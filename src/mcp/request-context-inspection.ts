import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  MajuRequestHeaders,
  mcpRequestContext,
} from './tool-invocation-trace';

type RequestContextExtra = {
  requestId?: unknown;
  sessionId?: unknown;
  authInfo?: unknown;
  requestInfo?: {
    method?: string;
    headers?: MajuRequestHeaders;
  };
};

export type RequestContextInspection = {
  [key: string]: unknown;
  headers: Record<string, unknown>;
  request: Record<string, unknown>;
  session: Record<string, unknown>;
  user: Record<string, unknown>;
  environment: Record<string, unknown>;
};

const NOT_PROVIDED = null;

const SENSITIVE_KEYWORDS = [
  'authorization',
  'cookie',
  'token',
  'secret',
  'password',
  'api-key',
  'apikey',
  'key',
];

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();

  return SENSITIVE_KEYWORDS.some((keyword) => lowerKey.includes(keyword));
}

function maskValue(key: string, value: unknown): unknown {
  if (value === undefined) {
    return NOT_PROVIDED;
  }

  if (!isSensitiveKey(key)) {
    return value;
  }

  if (typeof value === 'string' && value.toLowerCase().startsWith('bearer ')) {
    return 'Bearer ********';
  }

  return '********';
}

function maskObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskObject(item));
  }

  if (!value || typeof value !== 'object') {
    return value ?? NOT_PROVIDED;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      isSensitiveKey(key) ? maskValue(key, entryValue) : maskObject(entryValue),
    ]),
  );
}

function normalizeHeaders(headers: MajuRequestHeaders): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, maskValue(key, value)]),
  );
}

function getHeader(headers: MajuRequestHeaders, name: string): unknown {
  const headerName = name.toLowerCase();
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === headerName,
  );

  return entry?.[1] ?? NOT_PROVIDED;
}

function getFirstProvidedHeader(
  headers: MajuRequestHeaders,
  names: string[],
): unknown {
  for (const name of names) {
    const value = getHeader(headers, name);

    if (value !== NOT_PROVIDED) {
      return value;
    }
  }

  return NOT_PROVIDED;
}

function getHeadersByPrefix(
  headers: MajuRequestHeaders,
  prefixes: string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key]) =>
        prefixes.some((prefix) => key.toLowerCase().startsWith(prefix)),
      )
      .map(([key, value]) => [key, maskValue(key, value)]),
  );
}

function getHeadersByKeyword(
  headers: MajuRequestHeaders,
  keywords: string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key]) =>
        keywords.some((keyword) => key.toLowerCase().includes(keyword)),
      )
      .map(([key, value]) => [key, maskValue(key, value)]),
  );
}

function getCustomHeaders(headers: MajuRequestHeaders): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([key]) => {
        const lowerKey = key.toLowerCase();

        return (
          lowerKey.startsWith('x-') &&
          !lowerKey.startsWith('x-forwarded-') &&
          !lowerKey.startsWith('x-real-ip')
        );
      })
      .map(([key, value]) => [key, maskValue(key, value)]),
  );
}

export async function inspectRequestContext(
  extra: RequestContextExtra,
): Promise<RequestContextInspection> {
  const timestamp = new Date().toISOString();
  const requestContext = mcpRequestContext.getStore();
  const rawHeaders =
    requestContext?.headers ?? extra.requestInfo?.headers ?? {};
  const headers = normalizeHeaders(rawHeaders);
  const authorizationHeader = getHeader(rawHeaders, 'authorization');
  const mcpSessionHeader = getHeader(rawHeaders, 'mcp-session-id');
  const requestBody = maskObject(requestContext?.body);

  const inspection: RequestContextInspection = {
    headers,
    request: {
      timestamp,
      method: requestContext?.method ?? extra.requestInfo?.method ?? null,
      url: requestContext?.url ?? null,
      originalUrl: requestContext?.originalUrl ?? null,
      path: requestContext?.path ?? null,
      protocol: requestContext?.protocol ?? null,
      ip: requestContext?.ip ?? null,
      ips: requestContext?.ips ?? [],
      hostname: requestContext?.hostname ?? null,
      requestId: extra.requestId ?? null,
      userAgent: getHeader(rawHeaders, 'user-agent'),
      xForwardedHeaders: getHeadersByPrefix(rawHeaders, ['x-forwarded-']),
      customHeaders: getCustomHeaders(rawHeaders),
      body: requestBody,
    },
    session: {
      sessionId: extra.sessionId ?? mcpSessionHeader,
      mcpSessionId: mcpSessionHeader,
      conversationId: getFirstProvidedHeader(rawHeaders, [
        'conversation-id',
        'x-conversation-id',
        'openai-conversation-id',
        'x-openai-conversation-id',
      ]),
    },
    user: {
      userId: getFirstProvidedHeader(rawHeaders, [
        'user-id',
        'x-user-id',
        'openai-user-id',
        'x-openai-user-id',
      ]),
      authorizationHeaderPresent: authorizationHeader !== NOT_PROVIDED,
      authInfo: maskObject(extra.authInfo),
      oauthHeaders: getHeadersByKeyword(rawHeaders, ['oauth', 'authorization']),
    },
    environment: {
      nodeEnv: process.env.NODE_ENV ?? null,
      port: process.env.PORT ?? null,
      platform: process.platform,
      runtime: `node ${process.version}`,
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  const artifact = {
    timestamp,
    headers: inspection.headers,
    request: inspection.request,
    session: inspection.session,
    environment: inspection.environment,
  };

  const artifactsDir = join(process.cwd(), 'artifacts');
  await mkdir(artifactsDir, { recursive: true });
  await writeFile(
    join(artifactsDir, 'request-context.json'),
    JSON.stringify(artifact, null, 2),
    'utf8',
  );

  console.log('REQUEST_CONTEXT_INSPECTED', JSON.stringify(artifact, null, 2));

  return inspection;
}
