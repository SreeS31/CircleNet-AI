import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CircleNet-AI',
  description: 'Enterprise AI platform experience'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
