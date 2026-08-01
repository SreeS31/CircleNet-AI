import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'CircleNet Intelligence Cloud',
    template: '%s | CircleNet'
  },
  description: 'Enterprise relationship intelligence, project delivery and team analytics in one connected workspace.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
