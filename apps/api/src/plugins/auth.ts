import fp from 'fastify-plugin';

import { env } from '../config/env.js';
import { parseAuth } from '../auth/token.js';

export const authPlugin = fp(async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    const publicRoutes = ['/health', '/metrics'];
    const requestPath = request.url.split('?')[0] ?? request.url;
    if (publicRoutes.includes(requestPath)) {
      request.auth = { userId: 'public', role: 'support' };
      return;
    }

    try {
      const auth = await parseAuth(request.headers as Record<string, unknown>);

      if (!env.APP_ALLOWED_ROLES_LIST.includes(auth.role)) {
        reply.status(403).send({ error: 'Role is not allowed for this pilot.' });
        return;
      }

      request.auth = auth;
    } catch {
      reply.status(401).send({ error: 'Invalid authentication token.' });
    }
  });
});
