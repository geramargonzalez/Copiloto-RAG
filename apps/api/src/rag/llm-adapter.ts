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

export class OpenAICompatibleClient implements LLMClient {
  constructor(
    private readonly baseUrl = env.LLM_BASE_URL,
    private readonly chatModel = env.LLM_CHAT_MODEL,
    private readonly embedModel = env.LLM_EMBED_MODEL,
  ) {}

  async embed(input: string[]): Promise<number[][]> {
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

