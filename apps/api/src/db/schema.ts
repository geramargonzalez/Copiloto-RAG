import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value) {
    return value
      .slice(1, -1)
      .split(',')
      .filter(Boolean)
      .map(Number);
  },
});

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    docType: varchar('doc_type', { length: 100 }).notNull(),
    rolesAllowed: text('roles_allowed').array().notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validTo: timestamp('valid_to', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdx: index('documents_source_idx').on(table.sourceUrl),
  }),
);

export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    heading: varchar('heading', { length: 255 }),
    content: text('content').notNull(),
    tokenCount: integer('token_count').notNull(),
    docType: varchar('doc_type', { length: 100 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    rolesAllowed: text('roles_allowed').array().notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validTo: timestamp('valid_to', { withTimezone: true }),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdx: index('chunks_source_idx').on(table.sourceUrl),
    rolesIdx: index('chunks_roles_idx').on(table.rolesAllowed),
  }),
);

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 120 }).notNull(),
  userRole: varchar('user_role', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 120 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  intent: varchar('intent', { length: 20 }).notNull(),
  content: text('content').notNull(),
  citations: jsonb('citations').$type<unknown[]>().default([]).notNull(),
  metrics: jsonb('metrics').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 120 }).notNull(),
  rating: varchar('rating', { length: 10 }).notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const toolTraces = pgTable('tool_traces', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  requestId: varchar('request_id', { length: 120 }).notNull(),
  toolName: varchar('tool_name', { length: 120 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  sanitizedInput: jsonb('sanitized_input').$type<Record<string, unknown>>().notNull(),
  sanitizedOutput: jsonb('sanitized_output').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
