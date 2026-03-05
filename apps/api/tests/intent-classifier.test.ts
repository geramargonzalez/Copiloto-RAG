import { describe, expect, it, vi } from 'vitest';

import { classifyIntent } from '../src/rag/intent-classifier.js';
import type { LLMClient } from '../src/rag/llm-adapter.js';

const makeLLM = (label: string): { llm: LLMClient; chatMock: ReturnType<typeof vi.fn> } => {
  const chatMock = vi.fn(async () => ({
    text: label,
    usage: {
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
    },
  }));

  return {
    llm: {
      embed: async () => [[0.1, 0.2]],
      chat: chatMock,
    },
    chatMock,
  };
};

describe('intent classifier', () => {
  it('detects SOP intent by rules', async () => {
    const { llm } = makeLLM('OTHER');
    const intent = await classifyIntent('Cómo hago una nota de crédito', llm);
    expect(intent).toBe('SOP');
  });

  it('detects STATUS intent by rules', async () => {
    const { llm } = makeLLM('OTHER');
    const intent = await classifyIntent('Estado de la factura INV-2001', llm);
    expect(intent).toBe('STATUS');
  });

  it('falls back to llm when rules do not match', async () => {
    const { llm, chatMock } = makeLLM('SOP');
    const intent = await classifyIntent('Necesito asistencia para onboarding', llm);
    expect(intent).toBe('SOP');
    expect(chatMock).toHaveBeenCalledTimes(1);
  });
});
