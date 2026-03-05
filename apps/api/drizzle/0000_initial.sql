CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(255) NOT NULL,
  "source_url" text NOT NULL,
  "doc_type" varchar(100) NOT NULL,
  "roles_allowed" text[] NOT NULL,
  "valid_from" timestamptz,
  "valid_to" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "heading" varchar(255),
  "content" text NOT NULL,
  "token_count" integer NOT NULL,
  "doc_type" varchar(100) NOT NULL,
  "source_url" text NOT NULL,
  "roles_allowed" text[] NOT NULL,
  "valid_from" timestamptz,
  "valid_to" timestamptz,
  "embedding" vector(1536) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar(120) NOT NULL,
  "user_role" varchar(50) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "user_id" varchar(120) NOT NULL,
  "role" varchar(20) NOT NULL,
  "intent" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "citations" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "user_id" varchar(120) NOT NULL,
  "rating" varchar(10) NOT NULL,
  "comment" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tool_traces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
  "request_id" varchar(120) NOT NULL,
  "tool_name" varchar(120) NOT NULL,
  "status" varchar(20) NOT NULL,
  "sanitized_input" jsonb NOT NULL,
  "sanitized_output" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "documents_source_idx" ON "documents" ("source_url");
CREATE INDEX IF NOT EXISTS "chunks_source_idx" ON "chunks" ("source_url");
CREATE INDEX IF NOT EXISTS "chunks_roles_idx" ON "chunks" USING GIN ("roles_allowed");
CREATE INDEX IF NOT EXISTS "chunks_embedding_idx" ON "chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

