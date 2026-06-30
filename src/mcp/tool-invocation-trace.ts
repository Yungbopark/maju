import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type MajuRequestHeaders = Record<string, string | string[] | undefined>;

export type MajuRequestContext = {
  method?: string;
  headers: MajuRequestHeaders;
  body?: unknown;
};

export const mcpRequestContext = new AsyncLocalStorage<MajuRequestContext>();

type ToolTraceInput = {
  toolName: string;
  timestamp: string;
  requestId?: unknown;
  sessionId?: unknown;
  arguments?: unknown;
  extra?: {
    sessionId?: unknown;
    requestInfo?: {
      method?: string;
      headers?: MajuRequestHeaders;
    };
  };
};

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'proxy-authorization',
]);

function maskHeaderValue(
  name: string,
  value: string | string[] | undefined,
): string | string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (SENSITIVE_HEADER_NAMES.has(name.toLowerCase())) {
    return '[MASKED]';
  }

  return value;
}

function maskHeaders(headers: MajuRequestHeaders): MajuRequestHeaders {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      maskHeaderValue(name, value),
    ]),
  );
}

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

function getMcpHeaders(headers: MajuRequestHeaders): MajuRequestHeaders {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) =>
      name.toLowerCase().startsWith('mcp-'),
    ),
  );
}

function extractArgumentsFromBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const maybeRequest = body as {
    method?: unknown;
    params?: { name?: unknown; arguments?: unknown };
  };

  if (
    maybeRequest.method === 'tools/call' &&
    maybeRequest.params?.name === 'startConversation'
  ) {
    return maybeRequest.params.arguments ?? {};
  }

  return undefined;
}

export async function traceStartConversationInvocation(
  input: ToolTraceInput,
): Promise<void> {
  const requestContext = mcpRequestContext.getStore();
  const rawHeaders =
    requestContext?.headers ?? input.extra?.requestInfo?.headers ?? {};
  const headers = maskHeaders(rawHeaders);
  const method = requestContext?.method ?? input.extra?.requestInfo?.method;
  const authorizationHeader = getHeader(rawHeaders, 'authorization');
  const mcpSessionHeader = getHeader(rawHeaders, 'mcp-session-id');
  const mcpHeaders = maskHeaders(getMcpHeaders(rawHeaders));
  const args =
    input.arguments ?? extractArgumentsFromBody(requestContext?.body) ?? {};

  const trace = {
    timestamp: input.timestamp,
    toolName: input.toolName,
    requestId: input.requestId,
    httpMethod: method,
    userAgent: getHeader(rawHeaders, 'user-agent'),
    authorizationHeaderPresent: authorizationHeader !== undefined,
    mcpSessionId: input.sessionId ?? input.extra?.sessionId ?? mcpSessionHeader,
    mcpHeaders,
    headers,
    arguments: args,
  };

  const line = '='.repeat(50);
  console.log(`
${line}
START_CONVERSATION_CALLED

Timestamp:
${trace.timestamp}

Tool:
${trace.toolName}

RequestId:
${String(trace.requestId ?? '')}

HTTP Method:
${String(trace.httpMethod ?? '')}

User-Agent:
${JSON.stringify(trace.userAgent ?? '')}

Authorization Header Present:
${String(trace.authorizationHeaderPresent)}

MCP Session Header:
${JSON.stringify(mcpSessionHeader ?? '')}

MCP Headers:
${JSON.stringify(trace.mcpHeaders, null, 2)}

Request Headers:
${JSON.stringify(trace.headers, null, 2)}

Arguments:
${JSON.stringify(trace.arguments, null, 2)}

${line}
`);

  const artifactsDir = join(process.cwd(), 'artifacts');
  await mkdir(artifactsDir, { recursive: true });
  await writeFile(
    join(artifactsDir, 'start-conversation-call.json'),
    JSON.stringify(
      {
        timestamp: trace.timestamp,
        headers: trace.headers,
        arguments: trace.arguments,
        toolName: trace.toolName,
      },
      null,
      2,
    ),
    'utf8',
  );
}
