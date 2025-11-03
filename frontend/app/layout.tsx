import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare, ScrollText, Package } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Present Agent',
  description: 'AI gift recommendations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <div className="min-h-screen bg-background">
          {/* Navigation */}
          <nav className="border-b border-border">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex h-14 items-center justify-between">
                {/* Logo & Brand */}
                <Link href="/" className="flex items-center gap-3 group">
                  <span className="text-sm font-medium text-foreground">Present Agent</span>
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-1">
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:text-muted-foreground transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Link>
                  <Link
                    href="/logs"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ScrollText className="w-4 h-4" />
                    Logs
                  </Link>
                  <Link
                    href="/products"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    Products
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-5xl mx-auto px-6 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
