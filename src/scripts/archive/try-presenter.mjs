// Quick manual run for DialoguePresenter UX
// Run with: node --loader tsx scripts/try-presenter.mjs

import { DialoguePresenterAgent, detectUserContext } from '../src/services/agents/dialogue-presenter.ts';

const agent = new DialoguePresenterAgent();

const dialogueOutput = {
  mode: 'ask',
  questions: [
    {
      id: 'budget',
      type: 'essential',
      field: 'budget',
      question: "What's your budget range?",
      suggestedAnswers: [
        { label: 'Under $50', value: { min: 0, max: 50 } },
        { label: '$50–$100', value: { min: 50, max: 100 } },
      ],
      priority: 1,
      impactOnConfidence: 0.15,
    },
    {
      id: 'relationship',
      type: 'essential',
      field: 'relationshipType',
      question: 'Who is this for (friend, partner, parent, colleague)?',
      suggestedAnswers: [],
      priority: 2,
      impactOnConfidence: 0.1,
    },
  ],
  proceedWithRecommendations: false,
  reasoning: 'Low confidence, missing critical fields',
  confidenceAssessment: {
    overallConfidence: 0.3,
    criticalFieldsCovered: [],
    criticalFieldsMissing: ['budget', 'relationshipType', 'occasion', 'interests'],
    highImpactAmbiguities: [],
    criticalFieldCount: 0,
  },
  decisionTimeMs: 12,
  processedAt: new Date(),
};

// Provide a rough listenerOutput to infer user context
const listenerOutput = {
  userQuery: 'Need a fast gift idea',
  confidence: 0.3,
  interests: [],
  extractedAt: new Date(),
};

const userContext = detectUserContext(listenerOutput);

const result = await agent.process({
  dialogueOutput,
  userContext,
  conversationHistory: [],
});

console.log('\n--- DialoguePresenter (ASK) ---');
console.log(result.naturalLanguage);
if (result.encouragement) console.log('\nEncouragement:', result.encouragement);
console.log('\nQuestions:');
for (const q of result.questions) {
  console.log('-', q.question);
}
console.log('\n------------------------------\n');

