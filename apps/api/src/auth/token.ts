import { jwtVerify } from 'jose';

import { env } from '../config/env.js';

export type AuthUser = {
  userId: string;
  role: string;
  token?: string;
};

type Claims = {
  sub?: string;
  roles?: string[];
  role?: string;
};

const secret = new TextEncoder().encode(env.AUTH_JWT_SECRET);

const fallbackUser: AuthUser = {
  userId: 'dev-user',
  role: 'support',
};

export const parseAuth = async (headers: Record<string, unknown>): Promise<AuthUser> => {
  const authorization = typeof headers.authorization === 'string' ? headers.authorization : '';
  if (authorization.toLowerCase().startsWith('bearer ')) {
    const token = authorization.slice(7);
    const verified = await jwtVerify<Claims>(token, secret);
    const roles = verified.payload.roles ?? [];
    const role = verified.payload.role ?? roles[0] ?? 'support';
    const userId = verified.payload.sub ?? 'unknown-user';

    return {
      userId,
      role,
      token,
    };
  }

  const headerUserId = typeof headers['x-user-id'] === 'string' ? headers['x-user-id'] : undefined;
  const headerRole = typeof headers['x-user-role'] === 'string' ? headers['x-user-role'] : undefined;

  if (headerUserId && headerRole) {
    return { userId: headerUserId, role: headerRole };
  }

  return fallbackUser;
};

