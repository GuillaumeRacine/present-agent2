'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { storeSessionToken } from '@/lib/auth';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No token provided');
      setIsLoading(false);
      return;
    }

    verifyToken(token);
  }, [token]);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Store session token
      storeSessionToken(data.sessionToken, data.email, data.userId);

      // Redirect to home
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    router.push('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border p-8 text-center">
            <div className="animate-pulse mb-4">
              <div className="h-2 bg-border rounded w-24 mx-auto mb-2"></div>
              <div className="h-2 bg-border rounded w-32 mx-auto"></div>
            </div>
            <p className="text-sm text-muted-foreground">
              Verifying your magic link...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border p-8">
            <h1 className="text-lg font-medium mb-2 text-red-500">Verification failed</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {error}
            </p>
            <Button onClick={handleRetry} className="w-full">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border p-8 text-center">
            <div className="animate-pulse mb-4">
              <div className="h-2 bg-border rounded w-24 mx-auto mb-2"></div>
              <div className="h-2 bg-border rounded w-32 mx-auto"></div>
            </div>
            <p className="text-sm text-muted-foreground">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
