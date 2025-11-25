/**
 * DialoguePresenter Agent
 *
 * Converts raw DialogueManager outputs into warm, conversational,
 * human-like interactions. Adds empathy, acknowledgment, and natural
 * language wrappers to improve UX from 3/10 to 8/10 "feels human".
 *
 * Priority 1 UX improvement from validation report.
 *
 * Features:
 * - Acknowledgment: "Great! Shopping for Lisa who loves cooking..."
 * - Empathy: "I know finding the perfect gift can be tricky..."
 * - Natural transitions: "To help me find the best options..."
 * - Question framing: Context and explanations for each question
 * - Escape hatch: "Skip questions, show me options" for impatient users
 *
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/validation/DIALOGUE_MANAGER_UX_VALIDATION_REPORT.md
 * @see /Volumes/Crucial X8/Code/Present-Agent2/docs/validation/DIALOGUE_MANAGER_ACTION_PLAN.md
 */

import { BaseAgent } from './base';
import {
  DialoguePresenterInput,
  DialoguePresenterOutput,
  UserContext,
  EmotionalState,
  TimePressure,
  BudgetSensitivity,
  ContextSummary,
  ContextSummaryItem,
  ConversationHistoryItem,
} from '../../types/presentation';
import { ClarifyingQuestion, SuggestedAnswer } from '../../types/dialogue';
import { ListenerOutput } from '../../types/agents';

/**
 * DialoguePresenter agent implementation
 */
export class DialoguePresenterAgent extends BaseAgent<
  DialoguePresenterInput,
  DialoguePresenterOutput
> {
  name = 'DialoguePresenter';

  /**
   * Process dialogue output and generate conversational presentation
   */
  async process(input: DialoguePresenterInput): Promise<DialoguePresenterOutput> {
    const startTime = Date.now();

    try {
      this.log('Presenting dialogue output', {
        mode: input.dialogueOutput.mode,
        emotionalState: input.userContext.emotionalState,
        timePressure: input.userContext.timePressure,
      });

      // Route to appropriate presenter based on mode
      let output: DialoguePresenterOutput;

      switch (input.dialogueOutput.mode) {
        case 'ask':
          output = this.presentQuestions(input);
          break;
        case 'recommend':
          output = this.presentRecommendations(input);
          break;
        case 'hybrid':
          output = this.presentHybrid(input);
          break;
      }

      this.log('Presentation completed', {
        type: output.type,
        processingTimeMs: Date.now() - startTime,
      });

      return output;
    } catch (error) {
      this.log('ERROR: Presentation failed', { error });
      // Fallback to minimal presentation
      return this.buildFallbackPresentation(input);
    }
  }

  // ==========================================================================
  // Question Presentation (ASK mode)
  // ==========================================================================

  /**
   * Present clarifying questions with warmth and context
   */
  private presentQuestions(input: DialoguePresenterInput): DialoguePresenterOutput {
    const { dialogueOutput, userContext, conversationHistory } = input;

    if (dialogueOutput.mode !== 'ask') {
      throw new Error('Invalid mode for presentQuestions');
    }

    const questions = dialogueOutput.questions;

    // Build conversational message
    const greeting = this.getGreeting(userContext);
    const acknowledgment = this.getAcknowledgment(userContext, conversationHistory);
    const explanation = this.getExplanation(userContext, questions.length);
    const formattedQuestions = this.formatQuestions(questions, userContext);
    const closing = this.getClosing(userContext);
    const encouragement = this.getEncouragement(userContext);

    // Build natural language message
    const parts = [
      greeting,
      acknowledgment,
      explanation,
      formattedQuestions,
      closing,
    ].filter(Boolean); // Remove empty parts

    const naturalLanguage = parts.join('\n\n');

    return {
      type: 'questions',
      naturalLanguage,
      questions,
      encouragement,
      showEscapeHatch: true, // Always show escape hatch
    };
  }

  /**
   * Get context-aware greeting
   */
  private getGreeting(context: UserContext): string {
    // Time-pressured users
    if (context.timePressure === 'urgent') {
      return "Let's find something great, fast!";
    }

    // Stressed users
    if (context.emotionalState === 'stressed') {
      return "I know gift shopping can be stressful - I'm here to help!";
    }

    // Uncertain users
    if (context.emotionalState === 'uncertain') {
      return "No worries! I'll help you find something they'll love!";
    }

    // Excited users
    if (context.emotionalState === 'excited') {
      return "I love helping find the perfect gift!";
    }

    // Default warm greeting
    return "I'd love to help you find the perfect gift!";
  }

  /**
   * Get acknowledgment of what user told us
   */
  private getAcknowledgment(
    context: UserContext,
    history?: ConversationHistoryItem[]
  ): string {
    const parts: string[] = [];

    // Helper to check if value is meaningful (not awkward placeholders)
    const isMeaningful = (value: string | undefined): boolean => {
      if (!value) return false;
      const lower = value.toLowerCase();
      return !['unspecified', 'unknown', 'not specified', 'undefined', 'null'].includes(lower);
    };

    // Acknowledge recipient
    if (context.recipient?.relationshipType) {
      const relationship = this.formatRelationship(context.recipient.relationshipType);
      if (isMeaningful(relationship)) {
        parts.push(`shopping for your ${relationship}`);
      }
    }

    // Acknowledge interests
    if (context.interests && context.interests.length > 0) {
      const interests = context.interests.slice(0, 2).join(' and ');
      if (isMeaningful(interests)) {
        parts.push(`who loves ${interests}`);
      }
    }

    // Acknowledge occasion
    if (context.occasion?.name) {
      const occasion = context.occasion.name.replace(/_/g, ' ');
      if (isMeaningful(occasion)) {
        parts.push(`for ${occasion}`);
      }
    }

    if (parts.length > 0) {
      return `Great! So you're ${parts.join(', ')}.`;
    }

    return ''; // No acknowledgment if no context
  }

  /**
   * Get explanation of why we're asking questions
   */
  private getExplanation(context: UserContext, questionCount: number): string {
    // Time-pressured users - minimal explanation
    if (context.timePressure === 'urgent') {
      return `Just ${questionCount === 1 ? '1 quick question' : `${questionCount} quick questions`} to get you the best options:`;
    }

    // Budget-conscious users - emphasize value
    if (context.budgetSensitivity === 'high') {
      return "To find the most thoughtful options within your budget, I'd love to know:";
    }

    // Default explanation
    return `To give you the best recommendations, I just need to know a bit more:`;
  }

  /**
   * Format questions with natural language and context
   */
  private formatQuestions(
    questions: ClarifyingQuestion[],
    context: UserContext
  ): string {
    const formatted = questions.map((q, index) => {
      // Add special handling for budget question if user is budget-sensitive
      if (q.id === 'budget' && context.budgetSensitivity === 'high') {
        return this.formatBudgetQuestion(q, index + 1);
      }

      return this.formatQuestion(q, index + 1, context);
    });

    return formatted.join('\n\n');
  }

  /**
   * Format a single question
   */
  private formatQuestion(
    question: ClarifyingQuestion,
    number: number,
    context: UserContext
  ): string {
    const questionText = `${number}. ${question.question}`;
    const answers = this.formatAnswers(question.suggestedAnswers, question.field);
    const hint = this.getQuestionHint(question, context);

    const parts = [questionText];
    if (hint) parts.push(`   ${hint}`);
    parts.push(`   ${answers}`);

    return parts.join('\n');
  }

  /**
   * Format budget question with encouragement
   */
  private formatBudgetQuestion(question: ClarifyingQuestion, number: number): string {
    const questionText = `${number}. ${question.question}`;
    const encouragement = "   Great choices exist at every budget!";
    const answers = this.formatAnswers(question.suggestedAnswers, question.field);

    return `${questionText}\n${encouragement}\n   ${answers}`;
  }

  /**
   * Format suggested answers with appropriate emojis
   */
  private formatAnswers(answers: SuggestedAnswer[], field: string): string {
    const emoji = this.getEmojiForField(field);

    return answers
      .map((answer) => `${emoji} ${answer.label}`)
      .join(' | ');
  }

  /**
   * Get emoji for field type
   */
  private getEmojiForField(field: string): string {
    const emojiMap: Record<string, string> = {
      budget: '💰',
      interests: '🎯',
      relationship: '👥',
      relationshipType: '👥',
      occasion: '🎉',
      age: '👤',
      refine_music: '🎵',
      refine_cooking: '🍳',
      refine_outdoors: '🌲',
      refine_tech: '💻',
      refine_sports: '⚽',
      intent_priority: '🎯',
      space: '🏠',
      urgency: '⏰',
    };

    // Try exact match first
    if (emojiMap[field]) {
      return emojiMap[field];
    }

    // Try partial match (for refine_* questions)
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (field.includes(key)) {
        return emoji;
      }
    }

    return '•'; // Default bullet
  }

  /**
   * Get hint/explanation for why we're asking this question
   */
  private getQuestionHint(question: ClarifyingQuestion, context: UserContext): string {
    // Only add hints for essential questions to reduce clutter
    if (question.type !== 'essential') {
      return '';
    }

    const hints: Record<string, string> = {
      budget: 'This helps me show you options that fit.',
      interests: 'This ensures recommendations match their personality.',
      relationship: 'This helps me suggest appropriate gift types.',
      occasion: 'This helps me understand the context.',
    };

    return hints[question.id] || '';
  }

  /**
   * Get closing message
   */
  private getClosing(context: UserContext): string {
    if (context.timePressure === 'urgent') {
      return "Let's find something perfect, quickly!";
    }

    return "Let's find something they'll love!";
  }

  /**
   * Get encouragement message for specific contexts
   */
  private getEncouragement(context: UserContext): string | undefined {
    if (context.budgetSensitivity === 'high') {
      return "Remember: Thoughtful gifts come in all budgets!";
    }

    if (context.emotionalState === 'uncertain') {
      return "Don't worry - I'll guide you through this!";
    }

    return undefined;
  }

  // ==========================================================================
  // Recommendation Presentation (RECOMMEND mode)
  // ==========================================================================

  /**
   * Present transition to recommendations
   */
  private presentRecommendations(
    input: DialoguePresenterInput
  ): DialoguePresenterOutput {
    const { dialogueOutput, userContext, conversationHistory } = input;

    if (dialogueOutput.mode !== 'recommend') {
      throw new Error('Invalid mode for presentRecommendations');
    }

    const transition = this.getTransition(conversationHistory, userContext);
    const summary = this.buildContextSummary(userContext);

    const parts = [transition];
    if (summary && summary.items.length > 0) {
      parts.push(this.formatContextSummary(summary));
    }
    parts.push("Here are my top picks:");

    const naturalLanguage = parts.join('\n\n');

    return {
      type: 'recommendations',
      naturalLanguage,
      contextSummary: summary,
    };
  }

  /**
   * Get conversational transition between turns
   */
  private getTransition(
    history?: ConversationHistoryItem[],
    context?: UserContext
  ): string {
    // No history - first interaction
    if (!history || history.length === 0) {
      return "Based on what you've told me, here are some great options:";
    }

    const lastTurn = history[history.length - 1];

    // Coming from questions
    if (lastTurn.mode === 'ask') {
      return "Perfect! Now I can show you some thoughtful recommendations:";
    }

    // User made corrections
    if (lastTurn.userCorrected) {
      return "Ah, got it! Let me adjust those recommendations:";
    }

    // Default transition
    return "Based on what you've shared, here are some ideas:";
  }

  /**
   * Build context summary for display
   */
  private buildContextSummary(context: UserContext): ContextSummary | undefined {
    const items: ContextSummaryItem[] = [];

    // Budget
    if (context.budget) {
      items.push({
        icon: '✓',
        label: 'Budget',
        value: `$${context.budget.min}-${context.budget.max}`,
      });
    }

    // Interests
    if (context.interests && context.interests.length > 0) {
      const interests = context.interests.slice(0, 3).join(', ');
      items.push({
        icon: '✓',
        label: 'Interests',
        value: interests,
      });
    }

    // Recipient
    if (context.recipient?.relationshipType) {
      const relationship = this.formatRelationship(context.recipient.relationshipType);
      items.push({
        icon: '✓',
        label: 'For your',
        value: relationship,
      });
    }

    // Occasion
    if (context.occasion?.name) {
      const occasion = context.occasion.name.replace(/_/g, ' ');
      items.push({
        icon: '✓',
        label: 'Occasion',
        value: occasion,
      });
    }

    return items.length > 0 ? { items } : undefined;
  }

  /**
   * Format context summary as text
   */
  private formatContextSummary(summary: ContextSummary): string {
    const items = summary.items
      .map((item) => `${item.icon} ${item.label}: ${item.value}`)
      .join('\n');

    return `Based on what you told me:\n${items}`;
  }

  // ==========================================================================
  // Hybrid Mode Presentation
  // ==========================================================================

  /**
   * Present hybrid mode (recommendations + refinement)
   */
  private presentHybrid(input: DialoguePresenterInput): DialoguePresenterOutput {
    const { dialogueOutput, userContext, conversationHistory } = input;

    if (dialogueOutput.mode !== 'hybrid') {
      throw new Error('Invalid mode for presentHybrid');
    }

    const transition = this.getTransition(conversationHistory, userContext);
    const summary = this.buildContextSummary(userContext);

    const parts = [transition];
    if (summary && summary.items.length > 0) {
      parts.push(this.formatContextSummary(summary));
    }
    parts.push("Here are some great options to start:");

    const naturalLanguage = parts.join('\n\n');

    return {
      type: 'hybrid',
      naturalLanguage,
      refinementQuestions: dialogueOutput.questionsForRefinement,
      contextSummary: summary,
    };
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Format relationship type for natural language
   */
  private formatRelationship(relationshipType: string): string {
    const formatted: Record<string, string> = {
      mom: 'mom',
      dad: 'dad',
      mother: 'mom',
      father: 'dad',
      parent: 'parent',
      partner: 'partner',
      spouse: 'partner',
      wife: 'partner',
      husband: 'partner',
      sibling: 'sibling',
      brother: 'brother',
      sister: 'sister',
      friend: 'friend',
      coworker: 'coworker',
      colleague: 'colleague',
      boss: 'boss',
    };

    return formatted[relationshipType.toLowerCase()] || relationshipType;
  }

  /**
   * Build fallback presentation if something goes wrong
   */
  private buildFallbackPresentation(
    input: DialoguePresenterInput
  ): DialoguePresenterOutput {
    const { dialogueOutput } = input;

    switch (dialogueOutput.mode) {
      case 'ask':
        return {
          type: 'questions',
          naturalLanguage: "I'd love to help you find the perfect gift! Let me ask you a few questions:",
          questions: dialogueOutput.questions,
          showEscapeHatch: true,
        };

      case 'recommend':
        return {
          type: 'recommendations',
          naturalLanguage: "Here are some gift recommendations for you:",
        };

      case 'hybrid':
        return {
          type: 'hybrid',
          naturalLanguage: "Here are some recommendations. You can refine them if you'd like:",
          refinementQuestions: dialogueOutput.questionsForRefinement,
        };
    }
  }
}

/**
 * Utility function to detect user context from ListenerOutput
 */
export function detectUserContext(listener: ListenerOutput): UserContext {
  return {
    emotionalState: detectEmotionalState(listener),
    timePressure: detectTimePressure(listener),
    budgetSensitivity: detectBudgetSensitivity(listener),
    confidenceLevel: detectConfidenceLevel(listener),
    budget: listener.budget || undefined,
    interests: listener.interests?.map((i) => i.interest || i.toString()) || undefined,
    recipient: listener.recipient
      ? {
          relationshipType: listener.recipient.relationshipType,
          gender: listener.recipient.gender,
          age: listener.recipient.age,
        }
      : undefined,
    occasion: listener.occasion
      ? {
          name: listener.occasion.name,
          date: listener.occasion.date,
          daysUntil: listener.occasion.daysUntil,
        }
      : undefined,
  };
}

/**
 * Detect emotional state from query patterns
 */
function detectEmotionalState(listener: ListenerOutput): EmotionalState {
  const query = listener.userQuery.toLowerCase();

  // Stressed indicators
  if (query.match(/urgent|asap|quickly|hurry|need now|last[-\s]minute/)) {
    return 'stressed';
  }

  // Excited indicators
  if (query.match(/excited|love|can't wait|amazing|perfect/)) {
    return 'excited';
  }

  // Uncertain indicators
  if (query.match(/not sure|don't know|help|confused|unsure|maybe/)) {
    return 'uncertain';
  }

  return 'neutral';
}

/**
 * Detect time pressure from occasion and query
 */
function detectTimePressure(listener: ListenerOutput): TimePressure {
  const occasion = listener.occasion;

  if (occasion?.daysUntil !== undefined) {
    if (occasion.daysUntil <= 2) return 'urgent';
    if (occasion.daysUntil <= 7) return 'moderate';
  }

  const query = listener.userQuery.toLowerCase();
  if (query.match(/urgent|asap|tomorrow|today/)) return 'urgent';
  if (query.match(/soon|week|quickly/)) return 'moderate';

  return 'low';
}

/**
 * Detect budget sensitivity from budget range
 */
function detectBudgetSensitivity(listener: ListenerOutput): BudgetSensitivity {
  const budget = listener.budget;

  if (!budget) return 'medium';

  // Low budget = high sensitivity
  if (budget.max <= 50) return 'high';
  if (budget.max <= 150) return 'medium';

  return 'low';
}

/**
 * Detect confidence level from query specificity
 */
function detectConfidenceLevel(listener: ListenerOutput): 'confident' | 'uncertain' | 'overwhelmed' {
  const confidence = listener.confidence;

  if (confidence >= 0.7) return 'confident';
  if (confidence >= 0.4) return 'uncertain';

  return 'overwhelmed';
}
