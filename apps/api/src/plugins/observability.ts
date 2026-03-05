import fp from 'fastify-plugin';

import { metricsStore } from '../metrics/store.js';

export const observabilityPlugin = fp(async (app) => {
  app.addHook('onRequest', async (request) => {
    (request as { __startedAt?: number }).__startedAt = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const startedAt = (request as { __startedAt?: number }).__startedAt ?? Date.now();
    const endpoint =
      (request as { routeOptions?: { url?: string } }).routeOptions?.url ??
      request.url.split('?')[0] ??
      'unknown';
    const estimatedCostUsd = Number(reply.getHeader('x-estimated-cost-usd') ?? 0);
    const citationsCount = Number(reply.getHeader('x-citations-count') ?? 0);

    metricsStore.record({
      endpoint,
      latencyMs: Date.now() - startedAt,
      statusCode: reply.statusCode,
      estimatedCostUsd,
      citationsCount,
    });
  });
});
