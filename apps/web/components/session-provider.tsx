'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export const AppSessionProvider = ({ children }: Props) => <SessionProvider>{children}</SessionProvider>;

