export const GET_MAJU_STATUS_TOOL_NAME = 'getMajuStatus';

export interface MajuStatus {
  [key: string]: unknown;
  status: 'ok';
  service: 'maju';
  description: string;
  version: string;
}

export function getMajuStatus(): MajuStatus {
  return {
    status: 'ok',
    service: 'maju',
    description: 'AI Conversation Orchestration Platform',
    version: '0.1.0',
  };
}
