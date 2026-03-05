import { chatRequestSchema, feedbackSchema, redactPII } from '@copiloto/shared';
import cors from '@fastify/cors';
import Fastify from 'fastify';

import { env } from './config/env.js';
import { logger, safeLogValue } from './logger.js';
import { metricsStore } from './metrics/store.js';
import { authPlugin } from './plugins/auth.js';
import { observabilityPlugin } from './plugins/observability.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { runChatPipeline } from './rag/pipeline.js';
import { OpenAICompatibleClient, type LLMClient } from './rag/llm-adapter.js';
import type { ChatStore } from './rag/pipeline.js';
import {
  listConversations,
  listMessages,
  saveFeedback,
} from './repositories/conversation-repo.js';
import { MockStatusProvider } from './tools/mock-provider.js';
import type { StatusProvider } from './tools/types.js';

export type AppDeps = {
  llm?: LLMClient;
  statusProvider?: StatusProvider;
  chatStore?: ChatStore;
};

export const buildApp = (deps?: AppDeps) => {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
  });
  const llm = deps?.llm ?? new OpenAICompatibleClient();
  const statusProvider = deps?.statusProvider ?? new MockStatusProvider();

  app.register(cors, {
    origin: env.API_CORS_ORIGIN,
  });
  app.register(observabilityPlugin);
  app.register(authPlugin);
  app.register(rateLimitPlugin);

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  app.get('/metrics', async (request, reply) => {
    const format = (request.query as { format?: string }).format;
    if (format === 'json') {
      return metricsStore.snapshot();
    }
    reply.header('content-type', 'text/plain; version=0.0.4');
    return metricsStore.toPrometheus();
  });

  app.post('/chat', async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const result = await runChatPipeline({
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      auth: request.auth,
      llm,
      statusProvider,
      store: deps?.chatStore,
    });

    reply.header('x-estimated-cost-usd', result.metrics.estimatedCostUsd.toFixed(6));
    reply.header('x-citations-count', String(result.citations.length));

    app.log.info(
      {
        userId: request.auth.userId,
        role: request.auth.role,
        conversationId: result.conversationId,
        messageId: result.messageId,
        intent: safeLogValue(result.metrics),
      },
      'Chat completed',
    );

    return {
      ...result,
      answer: redactPII(result.answer, { extraPatterns: env.PII_BLOCKLIST_PATTERNS_LIST }),
    };
  });

  app.post('/feedback', async (request, reply) => {
    const parsed = feedbackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    await saveFeedback({
      conversationId: parsed.data.conversationId,
      messageId: parsed.data.messageId,
      userId: request.auth.userId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });

    return reply.send({ ok: true });
  });

  app.get('/conversations', async (request) => {
    const conversations = await listConversations(request.auth.userId);
    return { conversations };
  });

  app.get('/conversations/:id/messages', async (request, reply) => {
    const params = request.params as { id: string };
    const rows = await listMessages(params.id, request.auth.userId);
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }
    return { messages: rows };
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    app.log.error(
      {
        err: safeLogValue(message),
        stack: env.NODE_ENV === 'development' ? stack : undefined,
        path: request.url,
      },
      'Unhandled error',
    );
    reply.status(500).send({ error: 'Internal server error' });
  });

  return app;
};
