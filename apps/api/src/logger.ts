import { redactPII } from '@copiloto/shared';
import pino from 'pino';

import { env } from './config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  base: undefined,
  redact: {
    paths: ['req.headers.authorization', 'headers.authorization'],
    remove: true,
  },
});

export const safeLogValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return redactPII(value, { extraPatterns: env.PII_BLOCKLIST_PATTERNS_LIST });
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeLogValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, safeLogValue(entry)]),
    );
  }

  return value;
};

