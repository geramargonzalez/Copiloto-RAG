# Copiloto-RAG (MVP Read-Only)

MVP listo para correr de un copiloto corporativo RAG **solo lectura** con:

1. `Cómo hago X` (SOP/políticas/FAQ) con respuestas estructuradas y citaciones.
2. `Estado de Y` (pedido/factura/cliente) vía herramientas read-only mock (extensible a SuiteQL/REST reales).

## Decisiones técnicas

- **API**: Fastify + pino.
  - Justificación: Fastify ofrece alto rendimiento, esquemas de payload y hooks claros para métricas/rate-limit.
  - pino simplifica logging estructurado y redacción segura.
- **ORM/migraciones**: Drizzle ORM + `drizzle-kit`.
- **RAG**: implementación propia simple con `pgvector` (`<=>` cosine), filtros de rol/vigencia/docType.
- **Auth**: NextAuth con OIDC configurable + stub local (credentials), JWT con roles para API.
- **Observabilidad**: métricas in-memory (`/metrics` Prometheus-style o JSON).
- **Seguridad**:
  - Solo lectura para tools.
  - Allowlist de tools.
  - Validación estricta con zod.
  - Redacción PII en logs/respuestas.
  - Excluir PII de indexación por defecto.

## Estructura

```text
apps/
  api/        # Fastify API + RAG + ingest + eval runner + tests
  web/        # Next.js App Router UI + NextAuth
packages/
  shared/     # tipos, schemas zod, scrubber PII
data/sources/ # corpus estático dummy (MD/HTML)
eval/
  golden_set.jsonl
  reports/
docker-compose.yml
```

## Requisitos

- Node.js 20+
- pnpm 10+
- Docker (para PostgreSQL + pgvector)

## Setup rápido

1. Copiar variables:
   - `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`)
2. Levantar DB:
   - `docker compose up -d`
3. Instalar dependencias:
   - `pnpm install`
4. Ejecutar migraciones:
   - `pnpm db:migrate`
5. Ingestar corpus:
   - `pnpm ingest`
6. Levantar web+api:
   - `pnpm dev`

Web: `http://localhost:3000`  
API: `http://localhost:4000`

### Modo demo sin proveedor LLM externo

Podés ejecutar todo en local usando embeddings/chat mock:

- `LLM_BASE_URL=mock://local`
- `LLM_API_KEY=mock`

Con eso, `pnpm ingest` y `pnpm dev` funcionan con corpus dummy y tools mock sin depender de servicios externos.

## Scripts principales

- `pnpm dev`: corre `apps/web` y `apps/api` en paralelo.
- `pnpm dev:turbo`: misma ejecución usando turborepo.
- `pnpm build`: build de todo el monorepo.
- `pnpm typecheck`: typecheck de todos los paquetes.
- `pnpm typecheck:turbo`: typecheck usando turborepo.
- `pnpm lint`: lint de todo.
- `pnpm test`: tests unit/integration.
- `pnpm test:turbo`: tests usando turborepo.
- `pnpm db:migrate`: aplica migraciones Drizzle.
- `pnpm db:generate`: genera migraciones nuevas.
- `pnpm ingest`: indexa `data/sources` en pgvector.
- `pnpm eval`: ejecuta golden set y genera reporte markdown en `eval/reports`.

## Variables de entorno

Definidas en `.env.example`, incluyendo las requeridas:

- `DATABASE_URL`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_CHAT_MODEL`
- `LLM_EMBED_MODEL`
- `AUTH_OIDC_ISSUER`
- `AUTH_OIDC_CLIENT_ID`
- `AUTH_OIDC_CLIENT_SECRET`
- `APP_ALLOWED_ROLES`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

## API

### `POST /chat`

Input:

```json
{ "message": "string", "conversationId": "uuid-opcional" }
```

Output:

```json
{
  "answer": "string",
  "citations": [],
  "toolTraces": [],
  "conversationId": "uuid",
  "messageId": "uuid",
  "metrics": {
    "latencyMs": 0,
    "promptTokens": 0,
    "completionTokens": 0,
    "totalTokens": 0,
    "estimatedCostUsd": 0,
    "citationsCount": 0
  }
}
```

### `POST /feedback`

Input:

```json
{
  "conversationId": "uuid",
  "messageId": "uuid",
  "rating": "up|down",
  "comment": "opcional"
}
```

### Otros endpoints

- `GET /health`
- `GET /metrics` (`?format=json` opcional)
- `GET /conversations`
- `GET /conversations/:id/messages`

## Pipeline RAG (v1)

1. Clasifica intención: `SOP | STATUS | OTHER`.
2. SOP:
   - Retrieval topK con filtros por rol/vigencia/docType.
   - Respuesta estructurada.
   - Si evidencia insuficiente: “No lo sé con certeza...” + preguntas mínimas.
3. STATUS:
   - Ejecuta tools read-only (`getOrderStatus`, `getInvoiceStatus`, `getCustomerStatus`).
   - Validación estricta (zod), trazabilidad `requestId/timestamp/tool`.
   - Puede combinar contexto de política vía retrieval.
4. Guardrails:
   - Prohibido inventar.
   - No PII en respuesta/logs.
   - Si piden PII: rechazo explícito.

## Ingesta

Script obligatorio implementado en:

- `apps/api/src/ingest/index.ts`

Hace:

- lectura de `/data/sources`
- extracción de texto MD/HTML/PDF
- chunking por headings (300–800 tokens)
- scrub PII antes de indexar
- embeddings
- inserción en `documents` + `chunks` con metadata:
  - `title`, `sourceUrl`, `docType`, `rolesAllowed`, `validFrom`, `validTo`

## Evaluación

- Golden set: `eval/golden_set.jsonl` (40 preguntas dummy).
- Runner: `eval/run.ts` (wrapper) y lógica en `apps/api/src/eval/run.ts`.
- Métricas:
  - exact match baseline
  - F1 baseline
  - groundedness proxy (claims+citations)
  - source hit rate
  - costo estimado

Reporte generado en `eval/reports`.

## Seguridad y cumplimiento (checklist)

- [x] Read-only en tools.
- [x] Allowlist explícita de tools.
- [x] Validación de parámetros y límites.
- [x] Redacción PII en logs y respuestas.
- [x] Excluir PII de indexación por defecto.
- [x] RBAC y vigencia en retrieval.
- [x] Rate limiting por usuario/IP.
- [x] Trazabilidad de tool calls en DB.

## Integración con sistemas reales

Interfaz de tools en:

- `apps/api/src/tools/types.ts`

Provider actual:

- `apps/api/src/tools/mock-provider.ts`

Para conectar SuiteQL/REST real, implementar `StatusProvider` nuevo y reemplazar inyección en `buildApp`.
