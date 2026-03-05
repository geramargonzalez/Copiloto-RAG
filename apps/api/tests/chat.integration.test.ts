import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { buildApp } from '../src/app.js';
import type { LLMClient } from '../src/rag/llm-adapter.js';
import type { ChatStore } from '../src/rag/pipeline.js';
import { MockStatusProvider } from '../src/tools/mock-provider.js';

const createInMemoryStore = (): ChatStore => {
  const conversations = new Map<string, { userId: string }>();

  return {
    async ensureConversation(params) {
      if (params.conversationId && conversations.has(params.conversationId)) {
        return params.conversationId;
      }
      const id = randomUUID();
      conversations.set(id, { userId: params.userId });
      return id;
    },
    async appendMessage() {
      return randomUUID();
    },
    async saveToolTrace() {
      return;
    },
  };
};

const llmMock: LLMClient = {
  async embed() {
    return [[0.1, 0.2]];
  },
  async chat() {
    return {
      text: 'OTHER',
      usage: {
        promptTokens: 4,
        completionTokens: 1,
        totalTokens: 5,
      },
    };
  },
};

describe('POST /chat', () => {
  it('returns response payload using mock llm and in-memory store', async () => {
    const app = buildApp({
      llm: llmMock,
      statusProvider: new MockStatusProvider(),
      chatStore: createInMemoryStore(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/chat',
      payload: {
        message: 'Necesito asistencia para onboarding',
      },
      headers: {
        'x-user-id': 'qa-user',
        'x-user-role': 'support',
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.conversationId).toBeDefined();
    expect(payload.answer).toContain('No lo sé con certeza');
    expect(Array.isArray(payload.citations)).toBe(true);
    expect(payload.metrics).toBeDefined();

    await app.close();
  });
});
