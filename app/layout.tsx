// app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NextAuthProvider } from './providers'; // Import the provider

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Code Collab',
  description: 'Real-time collaborative code editor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>{children}</NextAuthProvider> {/* Wrap children */}
      </body>
    </html>
  );
}
