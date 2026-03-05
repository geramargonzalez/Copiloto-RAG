import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    apiToken: string;
    user: DefaultSession['user'] & {
      id: string;
      role: string;
      roles: string[];
    };
  }

  interface User {
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    roles?: string[];
    apiToken?: string;
  }
}

