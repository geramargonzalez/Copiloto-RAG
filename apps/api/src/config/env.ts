import { parseCsv, sharedEnvSchema } from '@copiloto/shared';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = sharedEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().url(),
  LLM_BASE_URL: z.string().url(),
  LLM_API_KEY: z.string().min(1),
  LLM_CHAT_MODEL: z.string().min(1),
  LLM_EMBED_MODEL: z.string().min(1),
  LLM_CHAT_PATH: z.string().default('/v1/chat/completions'),
  LLM_EMBED_PATH: z.string().default('/v1/embeddings'),
  LLM_MAX_TOKENS: z.coerce.number().int().min(128).max(4000).default(900),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.1),
  LLM_INPUT_COST_PER_1K: z.coerce.number().min(0).default(0),
  LLM_OUTPUT_COST_PER_1K: z.coerce.number().min(0).default(0),
  AUTH_JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me'),
  AUTH_OIDC_ISSUER: z.string().optional(),
  AUTH_OIDC_CLIENT_ID: z.string().optional(),
  AUTH_OIDC_CLIENT_SECRET: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(30),
  API_CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RETRIEVAL_TOPK: z.coerce.number().int().min(1).max(20).default(10),
  MAX_TOOL_RESULTS: z.coerce.number().int().min(1).max(20).default(3),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${formatted}`);
}

const piiPatterns = parsed.data.PII_BLOCKLIST_PATTERNS
  ? parseCsv(parsed.data.PII_BLOCKLIST_PATTERNS)
  : [];

export const env = {
  ...parsed.data,
  APP_ALLOWED_ROLES_LIST: parseCsv(parsed.data.APP_ALLOWED_ROLES),
  PII_BLOCKLIST_PATTERNS_LIST: piiPatterns,
};

export type AppEnv = typeof env;

