import type { Citation } from '@copiloto/shared';

import type { RetrievedChunk } from './retrieval.js';

const PII_REQUEST_PATTERNS = [
  /\b(email|correo|mail)\b/i,
  /\b(phone|tel[eé]fono|celular)\b/i,
  /\b(dni|passport|ssn|tax id|direcci[oó]n)\b/i,
];

export const userAskedForPII = (message: string): boolean =>
  PII_REQUEST_PATTERNS.some((pattern) => pattern.test(message));

export const hasEnoughEvidence = (intent: 'SOP' | 'STATUS' | 'OTHER', chunks: RetrievedChunk[]): boolean => {
  if (intent !== 'SOP') {
    return true;
  }
  if (chunks.length < 2) {
    return false;
  }
  const highScore = chunks.filter((item) => item.score >= 0.55);
  return highScore.length >= 2;
};

export const notEnoughEvidenceReply = (): {
  answer: string;
  followUpQuestions: string[];
  citations: Citation[];
} => ({
  answer:
    'No lo sé con certeza con la información disponible. Necesito más contexto para responder con evidencia confiable.',
  followUpQuestions: [
    '¿Qué proceso exacto querés ejecutar y en qué área?',
    '¿Tenés un ID de documento, pedido o factura asociado?',
    '¿Buscás la política vigente para un rol específico (finance, sales, support, admin)?',
  ],
  citations: [],
});

export const piiRefusalReply = (): string =>
  'No puedo exponer PII. Este copiloto opera en modo solo lectura y con protección de datos personales.';

