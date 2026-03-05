import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    auth: {
      userId: string;
      role: string;
      token?: string;
    };
  }
}

