import { SignJWT } from 'jose';
import type { NextAuthOptions } from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers/oauth';
import CredentialsProvider from 'next-auth/providers/credentials';

const allowedRoles = (process.env.APP_ALLOWED_ROLES ?? 'finance,sales,support,admin')
  .split(',')
  .map((role) => role.trim())
  .filter(Boolean);

const oidcConfigured = Boolean(
  process.env.AUTH_OIDC_ISSUER && process.env.AUTH_OIDC_CLIENT_ID && process.env.AUTH_OIDC_CLIENT_SECRET,
);

const createApiToken = async (params: { sub: string; role: string; roles: string[] }): Promise<string> => {
  const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? '');
  return new SignJWT({
    role: params.role,
    roles: params.roles,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(params.sub)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers: [
    ...(oidcConfigured
      ? ([
          {
            id: 'corporate-oidc',
            name: 'Corporate OIDC',
            type: 'oauth',
            issuer: process.env.AUTH_OIDC_ISSUER!,
            clientId: process.env.AUTH_OIDC_CLIENT_ID!,
            clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET!,
            authorization: { params: { scope: 'openid profile email' } },
            checks: ['pkce', 'state'],
            idToken: true,
            profile(profile: Record<string, unknown>) {
              const role = String(profile.role ?? 'support');
              const cleanRole = allowedRoles.includes(role) ? role : 'support';
              return {
                id: String(profile.sub ?? profile.email ?? 'oidc-user'),
                name: String(profile.name ?? profile.preferred_username ?? 'OIDC User'),
                email: String(profile.email ?? ''),
                role: cleanRole,
              };
            },
          } satisfies OAuthConfig<Record<string, unknown>>,
        ] as OAuthConfig<Record<string, unknown>>[])
      : []),
    CredentialsProvider({
      name: 'Local Stub',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        role: { label: 'Rol', type: 'text' },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const requestedRole = credentials?.role?.trim() ?? 'support';

        if (!username) {
          return null;
        }

        const role = allowedRoles.includes(requestedRole) ? requestedRole : 'support';

        return {
          id: username,
          name: username,
          email: `${username}@local.stub`,
          role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? 'support';
        token.roles = [token.role];
      }

      const sub = token.sub ?? 'anonymous';
      const role = typeof token.role === 'string' ? token.role : 'support';
      const roles = Array.isArray(token.roles) ? token.roles.map(String) : [role];
      token.apiToken = await createApiToken({ sub, role, roles });

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? 'anonymous';
      session.user.role = typeof token.role === 'string' ? token.role : 'support';
      session.user.roles = Array.isArray(token.roles) ? token.roles.map(String) : [session.user.role];
      session.apiToken = typeof token.apiToken === 'string' ? token.apiToken : '';
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
