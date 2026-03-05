import type { Config } from 'drizzle-kit';

import 'dotenv/config';

const config: Config = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
};

export default config;

