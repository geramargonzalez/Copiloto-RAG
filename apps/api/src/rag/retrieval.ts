import type { Citation } from '@copiloto/shared';
import { and, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import { chunks } from '../db/schema.js';
import type { LLMClient } from './llm-adapter.js';

export type RetrievedChunk = {
  id: string;
  title: string;
  heading: string | null;
  content: string;
  sourceUrl: string;
  score: number;
  docType: string;
};

type RetrieveArgs = {
  query: string;
  role: string;
  topK: number;
  llm: LLMClient;
  docTypes?: string[];
};

const toVectorLiteral = (embedding: number[]): string => `[${embedding.join(',')}]`;

export const retrieveChunks = async ({
  query,
  role,
  topK,
  llm,
  docTypes,
}: RetrieveArgs): Promise<RetrievedChunk[]> => {
  const [queryEmbedding] = await llm.embed([query]);
  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error('Embedding provider returned an empty vector for retrieval query.');
  }
  const vector = toVectorLiteral(queryEmbedding);
  const vectorSql = sql.raw(`'${vector}'::vector`);
  const now = new Date();

  const filters = and(
    sql`${role} = ANY(${chunks.rolesAllowed})`,
    or(isNull(chunks.validFrom), lte(chunks.validFrom, now)),
    or(isNull(chunks.validTo), gte(chunks.validTo, now)),
    docTypes?.length ? inArray(chunks.docType, docTypes) : undefined,
  );

  const rows = await db
    .select({
      id: chunks.id,
      title: chunks.title,
      heading: chunks.heading,
      content: chunks.content,
      sourceUrl: chunks.sourceUrl,
      docType: chunks.docType,
      score: sql<number>`1 - (${chunks.embedding} <=> ${vectorSql})`,
    })
    .from(chunks)
    .where(filters)
    .orderBy(sql`${chunks.embedding} <=> ${vectorSql}`)
    .limit(topK);

  return rows;
};

export const toCitations = (results: RetrievedChunk[], max = 4): Citation[] =>
  results.slice(0, max).map((item) => ({
    id: item.id,
    title: item.title,
    sourceUrl: item.sourceUrl,
    heading: item.heading ?? undefined,
    snippet: item.content.slice(0, 240),
  }));
