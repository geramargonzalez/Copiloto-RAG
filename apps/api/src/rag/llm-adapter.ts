import { env } from '../config/env.js';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatResult = {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export interface LLMClient {
  embed(input: string[]): Promise<number[][]>;
  chat(messages: ChatMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<ChatResult>;
}

type EmbedResponse = {
  data: Array<{ embedding: number[] }>;
};

type ChatResponse = {
  choices: Array<{ message: { content: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

const authHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${env.LLM_API_KEY}`,
  'Content-Type': 'application/json',
});

const vectorDimensions = 1536;
const isMockMode = (baseUrl: string): boolean =>
  baseUrl.startsWith('mock://') || env.LLM_API_KEY.toLowerCase() === 'mock';

const pseudoRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const mockEmbedding = (text: string): number[] => {
  const seedBase = text
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
  return Array.from({ length: vectorDimensions }, (_, index) =>
    Number(((pseudoRandom(seedBase + index) * 2 - 1) * 0.2).toFixed(6)),
  );
};

const mockClassification = (content: string): string => {
  if (/\b(estado|status|ORD-|INV-|CUS-|pedido|factura|cliente)\b/i.test(content)) {
    return 'STATUS';
  }
  if (/\b(c[oó]mo|policy|pol[ií]tica|procedimiento|sop|gu[ií]a)\b/i.test(content)) {
    return 'SOP';
  }
  return 'OTHER';
};

const mockSopResponse = (): string =>
  [
    'Resumen: Procedimiento orientativo generado en modo mock; validá contra fuentes listadas.',
    '',
    'Pasos:',
    '1. Confirmar alcance del caso y rol autorizado.',
    '2. Revisar política/SOP vigente con citaciones.',
    '3. Ejecutar validaciones y registrar trazabilidad.',
    '',
    'Notas / riesgos / excepciones:',
    '- No inventar datos no respaldados.',
    '- Si falta evidencia, declarar falta de certeza y pedir contexto mínimo.',
  ].join('\n');

export class OpenAICompatibleClient implements LLMClient {
  constructor(
    private readonly baseUrl = env.LLM_BASE_URL,
    private readonly chatModel = env.LLM_CHAT_MODEL,
    private readonly embedModel = env.LLM_EMBED_MODEL,
  ) {}

  async embed(input: string[]): Promise<number[][]> {
    if (isMockMode(this.baseUrl)) {
      return input.map((item) => mockEmbedding(item));
    }

    const response = await fetch(`${this.baseUrl}${env.LLM_EMBED_PATH}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: this.embedModel,
        input,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embeddings request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as EmbedResponse;
    return payload.data.map((entry) => entry.embedding);
  }

  async chat(messages: ChatMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<ChatResult> {
    if (isMockMode(this.baseUrl)) {
      const userText = messages[messages.length - 1]?.content ?? '';
      const isIntentPrompt = messages.some(
        (message) =>
          message.role === 'system' && message.content.toLowerCase().includes('classify user intent'),
      );
      const text = isIntentPrompt ? mockClassification(userText) : mockSopResponse();
      return {
        text,
        usage: {
          promptTokens: Math.max(1, Math.round(userText.length / 4)),
          completionTokens: Math.max(1, Math.round(text.length / 5)),
          totalTokens: Math.max(2, Math.round(userText.length / 4) + Math.round(text.length / 5)),
        },
      };
    }

    const response = await fetch(`${this.baseUrl}${env.LLM_CHAT_PATH}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: this.chatModel,
        messages,
        max_tokens: options?.maxTokens ?? env.LLM_MAX_TOKENS,
        temperature: options?.temperature ?? env.LLM_TEMPERATURE,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat completion failed with status ${response.status}`);
    }

    const payload = (await response.json()) as ChatResponse;
    const text = payload.choices[0]?.message?.content?.trim() ?? '';
    return {
      text,
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
        totalTokens: payload.usage?.total_tokens ?? 0,
      },
    };
  }
}
