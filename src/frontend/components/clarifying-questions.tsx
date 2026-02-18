'use client';

/**
 * Clarifying Questions Component
 *
 * Displays clarifying questions with natural language presentation,
 * suggested answers, and an escape hatch for impatient users.
 *
 * Priority 1 UX improvement from validation report.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SuggestedAnswer {
  label: string;
  value: string | number | Record<string, any>;
  description?: string;
}

interface ClarifyingQuestion {
  id: string;
  type: string;
  field: string;
  question: string;
  suggestedAnswers: SuggestedAnswer[];
  priority: number;
  rationale?: string;
}

interface FramedQuestion {
  original: ClarifyingQuestion;
  naturalLanguage: string;
  contextualHelp: string;
}

interface ClarifyingQuestionsProps {
  /** Natural language introduction */
  intro?: string;
  naturalLanguage?: string; // Backward compatibility

  /** Questions to display (can be ClarifyingQuestion[] or FramedQuestion[]) */
  questions: (ClarifyingQuestion | FramedQuestion)[];

  /** Encouragement message */
  encouragement?: string;

  /** Show escape hatch button? */
  showEscapeHatch?: boolean;

  /** Callback when user answers a single question */
  onAnswerSubmit?: (questionId: string, answer: any) => void;

  /** Callback when user submits all answers */
  onSubmitAnswers?: () => void;

  /** Callback when user uses escape hatch */
  onSkip?: () => void;
  onEscapeHatch?: () => void; // Backward compatibility

  /** Callback when user answers questions (backward compatibility) */
  onAnswer?: (answers: Record<string, any>) => void;

  /** Answered questions tracking */
  answeredQuestions?: Record<string, any>;

  /** Loading state */
  isLoading?: boolean;
}

export function ClarifyingQuestions({
  intro,
  naturalLanguage,
  questions,
  encouragement,
  showEscapeHatch = true,
  onAnswerSubmit,
  onSubmitAnswers,
  onSkip,
  onEscapeHatch,
  onAnswer,
  answeredQuestions,
  isLoading = false,
}: ClarifyingQuestionsProps) {
  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>({});

  // Use either external or local answer tracking
  const answers = answeredQuestions || localAnswers;

  const handleAnswerSelect = (questionId: string, value: any) => {
    if (onAnswerSubmit) {
      // External answer tracking
      onAnswerSubmit(questionId, value);
    } else {
      // Local answer tracking
      setLocalAnswers((prev) => ({
        ...prev,
        [questionId]: value,
      }));
    }
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length === 0) return;

    if (onSubmitAnswers) {
      onSubmitAnswers();
    } else if (onAnswer) {
      // Backward compatibility
      onAnswer(answers);
    }
  };

  const handleEscapeHatch = () => {
    if (onSkip) {
      onSkip();
    } else if (onEscapeHatch) {
      // Backward compatibility
      onEscapeHatch();
    }
  };

  // Helper to check if question is framed
  const isFramedQuestion = (q: any): q is FramedQuestion => {
    return 'original' in q && 'naturalLanguage' in q;
  };

  // Helper to extract the actual question
  const getQuestion = (q: ClarifyingQuestion | FramedQuestion): ClarifyingQuestion => {
    return isFramedQuestion(q) ? q.original : q;
  };

  // Helper to get display text
  const getQuestionText = (q: ClarifyingQuestion | FramedQuestion): string => {
    return isFramedQuestion(q) ? q.naturalLanguage : q.question;
  };

  // Helper to get contextual help
  const getContextualHelp = (q: ClarifyingQuestion | FramedQuestion): string | undefined => {
    return isFramedQuestion(q) ? q.contextualHelp : q.rationale;
  };

  const hasAnswers = Object.keys(answers).length > 0;
  const introText = intro || naturalLanguage;

  return (
    <div className="space-y-6">
      {/* Natural Language Introduction */}
      {introText && (
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-line text-foreground">
            {introText}
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, index) => {
          const question = getQuestion(q);
          const questionText = getQuestionText(q);
          const helpText = getContextualHelp(q);

          return (
            <Card key={question.id} className="p-4">
              <div className="space-y-3">
                {/* Question Number and Text */}
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{questionText}</p>
                    {helpText && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {helpText}
                      </p>
                    )}
                  </div>
                </div>

                {/* Answer Options */}
                <div className="flex flex-wrap gap-2">
                  {question.suggestedAnswers.map((answer) => (
                    <Button
                      key={answer.label}
                      variant={
                        answers[question.id] === answer.value
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => handleAnswerSelect(question.id, answer.value)}
                      disabled={isLoading}
                      className="whitespace-normal h-auto py-2"
                      aria-pressed={answers[question.id] === answer.value}
                    >
                      {answer.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Encouragement Message */}
      {encouragement && (
        <div className="text-sm text-muted-foreground italic text-center">
          {encouragement}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!hasAnswers || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Getting recommendations...' : 'Continue'}
        </Button>

        {/* Escape Hatch */}
        {showEscapeHatch && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  In a hurry?
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={handleEscapeHatch}
              disabled={isLoading}
              className="w-full"
            >
              Skip questions, show me options →
            </Button>
          </>
        )}
      </div>

      {/* Progress Indicator */}
      {hasAnswers && (
        <div className="text-sm text-center text-muted-foreground">
          {Object.keys(answers).length} of {questions.length} answered
        </div>
      )}
    </div>
  );
}
