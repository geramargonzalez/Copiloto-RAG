import type { Intent } from '@copiloto/shared';

import type { LLMClient } from './llm-adapter.js';

const SOP_PATTERNS = [
  /\b(c[oó]mo|como)\s+(hago|hacer|tramitar|gestionar)\b/i,
  /\b(step|steps|procedure|process|policy|pol[ií]tica|sop)\b/i,
  /\b(gu[ií]a|instructivo|manual)\b/i,
];

const STATUS_PATTERNS = [
  /\b(estado|status|tracking|seguimiento)\b/i,
  /\b(order|pedido|invoice|factura|customer|cliente)\b/i,
  /\b(ORD-\d{4,10}|INV-\d{4,10}|CUS-\d{4,10})\b/i,
];

const OTHER_PATTERNS = [/\b(chiste|joke|poema|song|lyrics)\b/i];

const classifyWithRules = (message: string): Intent | null => {
  if (OTHER_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'OTHER';
  }

  if (STATUS_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'STATUS';
  }

  if (SOP_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'SOP';
  }

  return null;
};

export const classifyIntent = async (message: string, llm: LLMClient): Promise<Intent> => {
  const byRules = classifyWithRules(message);
  if (byRules) {
    return byRules;
  }

  const response = await llm.chat(
    [
      {
        role: 'system',
        content:
          'Classify user intent into exactly one label: SOP, STATUS, OTHER. Return only the label.',
      },
      {
        role: 'user',
        content: message,
      },
    ],
    { maxTokens: 10, temperature: 0 },
  );

  const normalized = response.text.trim().toUpperCase();
  if (normalized.includes('STATUS')) {
    return 'STATUS';
  }
  if (normalized.includes('SOP')) {
    return 'SOP';
  }
  return 'OTHER';
};

