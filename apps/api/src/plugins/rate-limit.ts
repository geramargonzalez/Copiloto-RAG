import fp from 'fastify-plugin';

import { env } from '../config/env.js';

type Bucket = {
  resetAt: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

const keyFor = (userId: string, ip: string): string => `${userId}:${ip}`;

export const rateLimitPlugin = fp(async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    const requestPath = request.url.split('?')[0];
    if (requestPath === '/health' || requestPath === '/metrics') {
      return;
    }

    const key = keyFor(request.auth?.userId ?? 'unknown', request.ip);
    const now = Date.now();
    const windowMs = env.RATE_LIMIT_WINDOW_MS;
    const maxRequests = env.RATE_LIMIT_MAX_REQUESTS;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt < now) {
      buckets.set(key, { resetAt: now + windowMs, count: 1 });
      return;
    }

    existing.count += 1;
    if (existing.count > maxRequests) {
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        retryAfterMs: existing.resetAt - now,
      });
    }
  });
});
