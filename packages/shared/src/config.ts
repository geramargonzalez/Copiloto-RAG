import { z } from 'zod';

export const sharedEnvSchema = z.object({
  APP_ALLOWED_ROLES: z.string().default('finance,sales,support,admin'),
  PII_BLOCKLIST_PATTERNS: z.string().optional(),
});

export const parseCsv = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

