import './globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const geistSans = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cited',
  description: 'Habits backed by people who study this for a living.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen antialiased font-[family-name:var(--font-geist-sans)]">
        {children}
      </body>
    </html>
  );
}
