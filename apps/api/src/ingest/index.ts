import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { containsPII, redactPII } from '@copiloto/shared';

import { env } from '../config/env.js';
import { db, dbSql } from '../db/client.js';
import { chunks, documents } from '../db/schema.js';
import { logger } from '../logger.js';
import { OpenAICompatibleClient } from '../rag/llm-adapter.js';
import { chunkByHeadings } from './chunk.js';
import { extractDocument } from './extract-text.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../');
const sourcesDir = path.resolve(repoRoot, 'data', 'sources');
const SUPPORTED_EXTENSIONS = new Set(['.md', '.markdown', '.html', '.htm', '.pdf']);
const VECTOR_DIMENSIONS = 1536;

const listFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(resolved);
      }
      return SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [resolved] : [];
    }),
  );
  return files.flat();
};

const normalizeEmbedding = (vector: number[]): number[] => {
  if (vector.length === VECTOR_DIMENSIONS) {
    return vector;
  }
  if (vector.length > VECTOR_DIMENSIONS) {
    return vector.slice(0, VECTOR_DIMENSIONS);
  }
  return [...vector, ...Array(VECTOR_DIMENSIONS - vector.length).fill(0)];
};

const ingest = async (): Promise<void> => {
  const llm = new OpenAICompatibleClient();
  const files = await listFiles(sourcesDir);

  if (files.length === 0) {
    logger.warn({ sourcesDir }, 'No source files found.');
    return;
  }

  logger.info({ filesCount: files.length }, 'Starting ingestion');

  await db.delete(chunks);
  await db.delete(documents);

  for (const filePath of files) {
    const parsed = await extractDocument(filePath);
    const rawChunks = chunkByHeadings(parsed.body, 300, 800);
    const cleanChunks = rawChunks
      .filter((chunk) => !containsPII(chunk.content))
      .map((chunk) => ({
        heading: chunk.heading,
        content: redactPII(chunk.content, {
          extraPatterns: env.PII_BLOCKLIST_PATTERNS_LIST,
        }),
        tokenCount: chunk.tokenCount,
      }))
      .filter((chunk) => chunk.content.length > 30);

    if (cleanChunks.length === 0) {
      logger.warn({ filePath }, 'Skipping file without clean chunks');
      continue;
    }

    const [doc] = await db
      .insert(documents)
      .values({
        title: parsed.title,
        sourceUrl: parsed.sourceUrl,
        docType: parsed.docType,
        rolesAllowed: parsed.rolesAllowed,
        validFrom: parsed.validFrom,
        validTo: parsed.validTo,
      })
      .returning({ id: documents.id });
    if (!doc) {
      throw new Error(`Failed to insert document for ${filePath}`);
    }

    const embeddings = await llm.embed(cleanChunks.map((chunk) => chunk.content));

    await db.insert(chunks).values(
      cleanChunks.map((chunk, index) => ({
        documentId: doc.id,
        title: parsed.title,
        heading: chunk.heading,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        docType: parsed.docType,
        sourceUrl: parsed.sourceUrl,
        rolesAllowed: parsed.rolesAllowed,
        validFrom: parsed.validFrom,
        validTo: parsed.validTo,
        embedding: normalizeEmbedding(embeddings[index] ?? []),
      })),
    );

    logger.info(
      {
        title: parsed.title,
        chunks: cleanChunks.length,
        sourceUrl: parsed.sourceUrl,
      },
      'Document ingested',
    );
  }

  await dbSql.end();
  logger.info('Ingestion finished');
};

ingest().catch(async (error) => {
  logger.error({ err: error }, 'Ingestion failed');
  await dbSql.end();
  process.exit(1);
});
