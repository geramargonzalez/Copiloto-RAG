import type { Citation } from '@copiloto/shared';

import { env } from '../config/env.js';
import type { ToolTraceRecord } from '../tools/types.js';
import type { LLMClient } from './llm-adapter.js';
import type { RetrievedChunk } from './retrieval.js';

const formatChunkContext = (chunks: RetrievedChunk[]): string =>
  chunks
    .map(
      (chunk, index) =>
        `[#${index + 1}] ${chunk.title}${chunk.heading ? ` > ${chunk.heading}` : ''}\n` +
        `URL: ${chunk.sourceUrl}\n` +
        `Contenido:\n${chunk.content}\n`,
    )
    .join('\n');

const dedupeCitations = (citations: Citation[]): Citation[] => {
  const seen = new Set<string>();
  const result: Citation[] = [];
  for (const item of citations) {
    const key = `${item.sourceUrl}|${item.heading ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
};

export const estimateCost = (promptTokens: number, completionTokens: number): number =>
  Number(
    (
      (promptTokens / 1000) * env.LLM_INPUT_COST_PER_1K +
      (completionTokens / 1000) * env.LLM_OUTPUT_COST_PER_1K
    ).toFixed(6),
  );

export const generateSopAnswer = async (params: {
  llm: LLMClient;
  question: string;
  chunks: RetrievedChunk[];
  citations: Citation[];
}) => {
  const context = formatChunkContext(params.chunks.slice(0, 10));
  const prompt = [
    'Respondé en español y SOLO con evidencia del contexto.',
    'Formato obligatorio:',
    'Resumen: 1-2 líneas.',
    'Pasos:',
    '1. ...',
    '2. ...',
    'Notas / riesgos / excepciones: viñetas cortas.',
    'Si falta evidencia en el contexto, respondé: "No lo sé con certeza con la información disponible".',
    '',
    `Pregunta: ${params.question}`,
    '',
    `Contexto:\n${context}`,
  ].join('\n');

  const response = await params.llm.chat(
    [
      {
        role: 'system',
        content:
          'Asistente corporativo RAG de solo lectura. Prohibido inventar. No expongas PII. Si no hay evidencia, dilo.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      maxTokens: env.LLM_MAX_TOKENS,
      temperature: 0.1,
    },
  );

  return {
    answer: response.text,
    citations: dedupeCitations(params.citations),
    usage: response.usage,
  };
};

export const formatStatusAnswer = (params: {
  summary: string;
  traces: ToolTraceRecord[];
  citations: Citation[];
  now: string;
  policySupport?: string;
}) => {
  const traceLines = params.traces.map(
    (trace) => `- Tool: ${trace.toolName} | requestId: ${trace.requestId} | ts: ${trace.timestamp}`,
  );

  const docLines = params.citations.map((citation) => `- ${citation.title} (${citation.sourceUrl})`);

  const toolSource = traceLines.length ? traceLines.join('\n') : '- Sin trazas de herramienta';
  const docSource = docLines.length ? `\n${docLines.join('\n')}` : '\n- Sin documentos adicionales';

  return [
    `Estado actual (${params.now}):`,
    params.summary,
    params.policySupport ? `\nContexto de política:\n${params.policySupport}` : '',
    '\nFuentes:',
    toolSource,
    docSource,
  ]
    .filter(Boolean)
    .join('\n');
};

