import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { db, dbSql } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const run = async (): Promise<void> => {
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  await migrate(db, { migrationsFolder });
  await dbSql.end();
  process.stdout.write('Migrations applied successfully.\n');
};

run().catch((error) => {
  process.stderr.write(`Migration error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

