import { redactPII, type ChatResponse, type Citation, type Intent } from '@copiloto/shared';

import { env } from '../config/env.js';
import { safeLogValue } from '../logger.js';
import {
  appendMessage,
  ensureConversation,
  saveToolTrace,
} from '../repositories/conversation-repo.js';
import { executeStatusTools } from '../tools/read-only-tools.js';
import type { StatusProvider } from '../tools/types.js';
import { estimateCost, formatStatusAnswer, generateSopAnswer } from './generation.js';
import { hasEnoughEvidence, notEnoughEvidenceReply, piiRefusalReply, userAskedForPII } from './guardrails.js';
import { classifyIntent } from './intent-classifier.js';
import type { LLMClient } from './llm-adapter.js';
import { retrieveChunks, toCitations } from './retrieval.js';

type PipelineInput = {
  message: string;
  conversationId?: string;
  auth: {
    userId: string;
    role: string;
  };
  llm: LLMClient;
  statusProvider: StatusProvider;
};

const shouldAttachPolicyContext = (message: string): boolean =>
  /\b(c[oó]mo|policy|pol[ií]tica|procedimiento|gu[ií]a|sop)\b/i.test(message);

const toToolCitations = (traces: Awaited<ReturnType<typeof executeStatusTools>>['traces']): Citation[] =>
  traces.map((trace) => ({
    id: trace.requestId,
    title: `Tool ${trace.toolName}`,
    sourceUrl: `tool://${trace.toolName}/${trace.requestId}`,
    snippet: JSON.stringify(trace.output),
  }));

export const runChatPipeline = async (input: PipelineInput): Promise<ChatResponse> => {
  const startedAt = Date.now();
  const conversationId = await ensureConversation({
    conversationId: input.conversationId,
    userId: input.auth.userId,
    userRole: input.auth.role,
  });

  if (userAskedForPII(input.message)) {
    await appendMessage({
      conversationId,
      userId: input.auth.userId,
      role: 'user',
      intent: 'OTHER',
      content: input.message,
      citations: [],
      metrics: {},
    });
    const answer = piiRefusalReply();
    const assistantId = await appendMessage({
      conversationId,
      userId: input.auth.userId,
      role: 'assistant',
      intent: 'OTHER',
      content: answer,
      citations: [],
      metrics: {},
    });

    return {
      answer,
      citations: [],
      toolTraces: [],
      conversationId,
      messageId: assistantId,
      metrics: {
        latencyMs: Date.now() - startedAt,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        citationsCount: 0,
      },
    };
  }

  await appendMessage({
    conversationId,
    userId: input.auth.userId,
    role: 'user',
    intent: 'OTHER',
    content: redactPII(input.message, { extraPatterns: env.PII_BLOCKLIST_PATTERNS_LIST }),
    citations: [],
    metrics: {},
  });

  const intent = await classifyIntent(input.message, input.llm);
  let answer = '';
  let citations: Citation[] = [];
  let toolTraces: Awaited<ReturnType<typeof executeStatusTools>>['traces'] = [];
  let promptTokens = 0;
  let completionTokens = 0;

  if (intent === 'SOP') {
    const chunks = await retrieveChunks({
      query: input.message,
      role: input.auth.role,
      topK: env.RETRIEVAL_TOPK,
      llm: input.llm,
      docTypes: ['sop', 'policy', 'faq'],
    });
    citations = toCitations(chunks, 5);

    if (!hasEnoughEvidence(intent, chunks) || citations.length < 2) {
      const fallback = notEnoughEvidenceReply();
      answer = `${fallback.answer}\n\nPreguntas mínimas:\n1. ${fallback.followUpQuestions[0]}\n2. ${fallback.followUpQuestions[1]}\n3. ${fallback.followUpQuestions[2]}\n\nSugerencia: revisá el portal de SOPs interno o abrí un ticket en soporte.`;
      citations = [];
    } else {
      const generated = await generateSopAnswer({
        llm: input.llm,
        question: input.message,
        chunks,
        citations,
      });
      answer = generated.answer;
      promptTokens += generated.usage.promptTokens;
      completionTokens += generated.usage.completionTokens;
      citations = generated.citations;
    }
  } else if (intent === 'STATUS') {
    const toolResult = await executeStatusTools(input.message, input.statusProvider);
    toolTraces = toolResult.traces;
    citations = toToolCitations(toolTraces);

    let policySupport: string | undefined;
    if (shouldAttachPolicyContext(input.message)) {
      const policyChunks = await retrieveChunks({
        query: input.message,
        role: input.auth.role,
        topK: Math.min(4, env.RETRIEVAL_TOPK),
        llm: input.llm,
        docTypes: ['sop', 'policy', 'faq'],
      });
      const docCitations = toCitations(policyChunks, 2);
      citations = [...citations, ...docCitations];
      if (policyChunks.length) {
        policySupport = `Resumen:\n${policyChunks
          .slice(0, 2)
          .map((chunk) => `- ${chunk.title}: ${chunk.content.slice(0, 180)}...`)
          .join('\n')}`;
      }
    }

    answer = formatStatusAnswer({
      summary: toolResult.summary,
      traces: toolTraces,
      citations,
      now: new Date().toISOString(),
      policySupport,
    });
  } else {
    answer =
      'No lo sé con certeza con la información disponible. Puedo ayudarte con SOP/políticas o estado de pedido/factura/cliente.';
  }

  const cleanAnswer = redactPII(answer, { extraPatterns: env.PII_BLOCKLIST_PATTERNS_LIST });
  const estimatedCostUsd = estimateCost(promptTokens, completionTokens);
  const messageId = await appendMessage({
    conversationId,
    userId: input.auth.userId,
    role: 'assistant',
    intent,
    content: cleanAnswer,
    citations: safeLogValue(citations) as unknown[],
    metrics: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd,
    },
  });

  for (const trace of toolTraces) {
    await saveToolTrace({
      conversationId,
      messageId,
      requestId: trace.requestId,
      toolName: trace.toolName,
      status: trace.status,
      input: trace.input,
      output: trace.output,
    });
  }

  return {
    answer: cleanAnswer,
    citations,
    toolTraces: toolTraces.map((trace) => ({
      toolName: trace.toolName,
      requestId: trace.requestId,
      timestamp: trace.timestamp,
      status: trace.status,
    })),
    conversationId,
    messageId,
    metrics: {
      latencyMs: Date.now() - startedAt,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd,
      citationsCount: citations.length,
    },
  };
};

