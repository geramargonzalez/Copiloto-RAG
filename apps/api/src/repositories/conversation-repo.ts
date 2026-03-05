import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { conversations, feedback, messages, toolTraces } from '../db/schema.js';

export const ensureConversation = async (params: {
  conversationId?: string;
  userId: string;
  userRole: string;
}): Promise<string> => {
  if (params.conversationId) {
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, params.conversationId), eq(conversations.userId, params.userId)))
      .limit(1);
    const first = existing[0];
    if (first) {
      return first.id;
    }
  }

  const [created] = await db
    .insert(conversations)
    .values({
      userId: params.userId,
      userRole: params.userRole,
    })
    .returning({ id: conversations.id });
  if (!created) {
    throw new Error('Unable to create conversation');
  }

  return created.id;
};

export const appendMessage = async (params: {
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  intent: string;
  content: string;
  citations: unknown[];
  metrics: Record<string, unknown>;
}): Promise<string> => {
  const [created] = await db
    .insert(messages)
    .values({
      conversationId: params.conversationId,
      userId: params.userId,
      role: params.role,
      intent: params.intent,
      content: params.content,
      citations: params.citations,
      metrics: params.metrics,
    })
    .returning({ id: messages.id });
  if (!created) {
    throw new Error('Unable to append message');
  }

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, params.conversationId));

  return created.id;
};

export const saveToolTrace = async (params: {
  conversationId: string;
  messageId: string;
  requestId: string;
  toolName: string;
  status: 'ok' | 'error';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}): Promise<void> => {
  await db.insert(toolTraces).values({
    conversationId: params.conversationId,
    messageId: params.messageId,
    requestId: params.requestId,
    toolName: params.toolName,
    status: params.status,
    sanitizedInput: params.input,
    sanitizedOutput: params.output,
  });
};

export const saveFeedback = async (params: {
  conversationId: string;
  messageId: string;
  userId: string;
  rating: string;
  comment?: string;
}): Promise<void> => {
  await db.insert(feedback).values({
    conversationId: params.conversationId,
    messageId: params.messageId,
    userId: params.userId,
    rating: params.rating,
    comment: params.comment,
  });
};

export const listConversations = async (userId: string) =>
  db
    .select({
      id: conversations.id,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      role: conversations.userRole,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(100);

export const listMessages = async (conversationId: string, userId: string) =>
  db
    .select({
      id: messages.id,
      role: messages.role,
      intent: messages.intent,
      content: messages.content,
      citations: messages.citations,
      metrics: messages.metrics,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(eq(messages.conversationId, conversationId), eq(conversations.userId, userId)))
    .orderBy(asc(messages.createdAt));
