export type Intent = 'SOP' | 'STATUS' | 'OTHER';

export type UserRole = 'finance' | 'sales' | 'support' | 'admin';

export type Citation = {
  id: string;
  title: string;
  sourceUrl: string;
  heading?: string;
  snippet: string;
};

export type ToolTrace = {
  toolName: string;
  requestId: string;
  timestamp: string;
  status: 'ok' | 'error';
};

export type ChatMetrics = {
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  citationsCount: number;
};

export type ChatRequest = {
  message: string;
  conversationId?: string;
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
  toolTraces: ToolTrace[];
  conversationId: string;
  messageId: string;
  metrics: ChatMetrics;
};

export type FeedbackRequest = {
  conversationId: string;
  messageId: string;
  rating: 'up' | 'down';
  comment?: string;
};

