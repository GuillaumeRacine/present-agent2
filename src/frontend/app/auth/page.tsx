'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      setIsSent(true);
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setIsSent(false);
    setEmail('');
    setError('');
    setPreviewUrl('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {!isSent ? (
          <div className="bg-card border border-border p-8">
            <h1 className="text-lg font-medium mb-2">Sign in to Present Agent</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your email to receive a magic link
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs text-muted-foreground mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-background border border-input text-sm"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-xs text-red-500 border border-red-500 p-2 bg-red-500/10">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send magic link'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-card border border-border p-8">
            <h1 className="text-lg font-medium mb-2">Check your email</h1>
            <p className="text-sm text-muted-foreground mb-4">
              We've sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Click the link in the email to sign in. The link expires in 15 minutes.
            </p>

            {previewUrl && (
              <div className="mb-6 p-3 bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Development mode - Preview URL:
                </p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-foreground hover:underline break-all"
                >
                  {previewUrl}
                </a>
              </div>
            )}

            <Button
              onClick={handleTryAgain}
              variant="outline"
              className="w-full"
            >
              Use different email
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
