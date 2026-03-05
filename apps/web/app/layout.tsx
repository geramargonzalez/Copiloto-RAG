import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppSessionProvider } from '../components/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Copiloto RAG (Read-Only)',
  description: 'MVP copiloto corporativo con citaciones y trazabilidad',
};

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="es">
      <body className="font-shell">
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
