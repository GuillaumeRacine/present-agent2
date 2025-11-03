'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from '@/components/message-bubble';
import { ProductCard } from '@/components/product-card';
import { ChatLoading } from '@/components/chat-loading';
import { Send, RotateCcw, LogOut } from 'lucide-react';
import { getUserId, getSessionId, resetSession, getUserEmail, isAuthenticated, clearUserData, verifySession } from '@/lib/auth';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  recommendations?: Recommendation[];
}

interface Recommendation {
  rank: number;
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    vendor: string;
    imageUrl?: string;
  };
  reasoning: string;
  confidence: number;
  tags?: string[];
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Hi! I\'m your AI gift recommendation assistant. Tell me about who you\'re shopping for and I\'ll help you find the perfect gift!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check if user has a session token
      if (!isAuthenticated()) {
        router.push('/auth');
        return;
      }

      // Verify session with backend
      const result = await verifySession();
      if (!result.valid) {
        // Session expired or invalid, redirect to login
        clearUserData();
        router.push('/auth');
        return;
      }

      // Set user data
      const uid = getUserId();
      const sid = getSessionId();
      const email = getUserEmail();

      setUserId(uid);
      setSessionId(sid);
      setUserEmail(email);
      setIsAuthenticating(false);
    };

    checkAuth();
  }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !userId) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          userId: userId,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.intro || 'Here are some gift recommendations for you:',
        timestamp: new Date(),
        recommendations: data.recommendations || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    const newSessionId = resetSession();
    setSessionId(newSessionId);
    setMessages([
      {
        role: 'system',
        content: 'New conversation started. How can I help you find the perfect gift?',
        timestamp: new Date(),
      },
    ]);
  };

  const handleLogout = () => {
    clearUserData();
    router.push('/auth');
  };

  // Show loading state while authenticating
  if (isAuthenticating) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center border border-border">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <div className="h-2 bg-border rounded w-24 mx-auto mb-2"></div>
            <div className="h-2 bg-border rounded w-32 mx-auto"></div>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col border border-border overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium text-foreground">
            Gift Recommendations
          </h1>
          {userEmail && (
            <p className="text-xs text-muted-foreground">
              {userEmail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleNewSession}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            title="Start new conversation"
          >
            <RotateCcw className="w-3 h-3" />
            New Chat
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            title="Logout"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-4 space-y-4">
          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            >
              {message.recommendations && message.recommendations.length > 0 && (
                <div className="grid gap-3 mt-3">
                  {message.recommendations.map((rec) => (
                    <ProductCard
                      key={rec.product.id}
                      rank={rec.rank}
                      product={rec.product}
                      reasoning={rec.reasoning}
                      confidence={rec.confidence}
                      tags={rec.tags}
                    />
                  ))}
                </div>
              )}
            </MessageBubble>
          ))}

          {isLoading && <ChatLoading />}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe who you're shopping for..."
            className="flex-1 px-3 py-2 bg-background border border-input text-sm placeholder:text-muted-foreground disabled:opacity-50"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="sm"
            className="px-4"
          >
            {isLoading ? '...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
}
