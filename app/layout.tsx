import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/shared/QueryProvider';

export const metadata: Metadata = {
  title: 'Smart Logics Dialer',
  description: 'Cold Calling CRM & Dialer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
