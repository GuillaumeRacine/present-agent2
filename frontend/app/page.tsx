'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from '@/components/message-bubble';
import { ProductCard } from '@/components/product-card';
import { ChatLoading } from '@/components/chat-loading';
import { ProductComparison } from '@/components/product-comparison';
import { ClarifyingQuestions } from '@/components/clarifying-questions';
import { Send, RotateCcw, LogOut, ArrowLeftRight } from 'lucide-react';
import { getUserId, getSessionId, resetSession, getUserEmail, isAuthenticated, clearUserData, verifySession } from '@/lib/auth';

interface ClarifyingQuestion {
  id: string;
  type: string;
  field: string;
  question: string;
  suggestedAnswers: Array<{
    value: any;
    label: string;
    description?: string;
  }>;
  priority: number;
  impactOnConfidence?: number;
  rationale?: string;
}

interface FramedQuestion {
  original: ClarifyingQuestion;
  naturalLanguage: string;
  contextualHelp: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system' | 'questions';
  content: string;
  timestamp: Date;
  recommendations?: Recommendation[];
  questions?: FramedQuestion[];
  naturalLanguageIntro?: string;
  encouragement?: string;
  showEscapeHatch?: boolean;
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
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});
  const [isAnsweringQuestions, setIsAnsweringQuestions] = useState(false);
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
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          userId: userId,
          sessionId: sessionId,
          // Include answers if we're answering questions
          clarifications: Object.keys(questionAnswers).length > 0 ? questionAnswers : undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();

      // Handle different response modes
      if (data.mode === 'clarifying') {
        // Backend is asking clarifying questions
        const questionsMessage: Message = {
          role: 'questions',
          content: data.naturalLanguage || 'I have a few questions to help find the perfect gift:',
          timestamp: new Date(),
          questions: data.questions || [],
          naturalLanguageIntro: data.naturalLanguage,
          encouragement: data.encouragement,
          showEscapeHatch: data.showEscapeHatch,
        };
        setMessages((prev) => [...prev, questionsMessage]);
        setIsAnsweringQuestions(true);
        setQuestionAnswers({}); // Reset answers for new questions
      } else {
        // Backend is showing recommendations (mode: 'recommendations' or 'recommendations_with_refinement')
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.naturalLanguage || data.intro || 'Here are some gift recommendations for you:',
          timestamp: new Date(),
          recommendations: data.recommendations?.rankedRecommendations || data.recommendations || [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsAnsweringQuestions(false);
        setQuestionAnswers({}); // Clear answers after successful recommendation
      }
    } catch (error) {
      let errorText = 'Something went wrong';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorText = 'Request timed out. The server took too long to respond. Please try again.';
        } else {
          errorText = error.message;
        }
      }
      const errorMessage: Message = {
        role: 'system',
        content: `Error: ${errorText}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerQuestion = (questionId: string, answer: any) => {
    setQuestionAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitAnswers = async () => {
    if (Object.keys(questionAnswers).length === 0) return;

    const answersText = Object.entries(questionAnswers)
      .map(([id, value]) => `${id}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(', ');

    const userMessage: Message = {
      role: 'user',
      content: `My answers: ${answersText}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'Continue with my answers',
          userId: userId,
          sessionId: sessionId,
          clarifications: questionAnswers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.naturalLanguage || data.intro || 'Here are some gift recommendations for you:',
        timestamp: new Date(),
        recommendations: data.recommendations?.rankedRecommendations || data.recommendations || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsAnsweringQuestions(false);
      setQuestionAnswers({});
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

  const handleSkipQuestions = async () => {
    const userMessage: Message = {
      role: 'user',
      content: 'Skip questions, show me options',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'Show me recommendations with what you know',
          userId: userId,
          sessionId: sessionId,
          skipQuestions: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.naturalLanguage || data.intro || 'Here are some recommendations based on what you\'ve told me:',
        timestamp: new Date(),
        recommendations: data.recommendations?.rankedRecommendations || data.recommendations || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsAnsweringQuestions(false);
      setQuestionAnswers({});
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

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const getComparisonItems = () => {
    const items: any[] = [];
    messages.forEach(msg => {
      if (msg.recommendations) {
        msg.recommendations.forEach(rec => {
          if (selectedProducts.has(rec.product.id)) {
            items.push(rec);
          }
        });
      }
    });
    return items;
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
    <>
      {showComparison && (
        <ProductComparison
          items={getComparisonItems()}
          onClose={() => setShowComparison(false)}
        />
      )}

      <div className="h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] flex flex-col border border-border overflow-hidden rounded-none sm:rounded-sm">
        {/* Chat Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium text-foreground truncate">
              Gift Recommendations
            </h1>
            {userEmail && (
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {selectedProducts.size > 0 && (
              <button
                onClick={() => setShowComparison(true)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 whitespace-nowrap"
                title="Compare selected products"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span className="hidden sm:inline">Compare</span> ({selectedProducts.size})
              </button>
            )}
            <button
              onClick={handleNewSession}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Start new conversation"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Logout"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea
          className="flex-1 px-4 sm:px-6"
          role="log"
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="py-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className="animate-[fade-in_0.3s_ease-out]"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {message.role === 'questions' ? (
                  <ClarifyingQuestions
                    intro={message.naturalLanguageIntro || message.content}
                    questions={message.questions || []}
                    encouragement={message.encouragement}
                    onAnswerSubmit={(questionId, answer) => {
                      handleAnswerQuestion(questionId, answer);
                    }}
                    onSubmitAnswers={handleSubmitAnswers}
                    onSkip={message.showEscapeHatch ? handleSkipQuestions : undefined}
                    answeredQuestions={questionAnswers}
                  />
                ) : (
                  <MessageBubble
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                  >
                    {message.recommendations && message.recommendations.length > 0 && (
                      <div className="grid gap-3 mt-3">
                        {message.recommendations.map((rec, recIndex) => (
                          <div
                            key={rec.product.id}
                            className="animate-[slide-up_0.4s_ease-out]"
                            style={{ animationDelay: `${recIndex * 0.1}s` }}
                          >
                            <ProductCard
                              rank={rec.rank}
                              product={rec.product}
                              reasoning={rec.reasoning}
                              confidence={rec.confidence}
                              tags={rec.tags}
                              onSelect={() => toggleProductSelection(rec.product.id)}
                              isSelected={selectedProducts.has(rec.product.id)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </MessageBubble>
                )}
              </div>
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
              className="flex-1 px-3 py-2 bg-background border border-input text-sm placeholder:text-muted-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              className="px-4 transition-all hover:scale-105"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                  <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                </span>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
