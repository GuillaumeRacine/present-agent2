// Run with: node --loader tsx test-dialogue-turn.mjs
// or:       tsx test-dialogue-turn.mjs
import { DialogueManagerAgent } from './src/services/agents/dialogue-manager.ts';

const agent = new DialogueManagerAgent();

// Test case: Max turns with history
const input = {
  listenerOutput: {
    userQuery: "Test query",
    confidence: 0.3,
    interests: [],
    extractedAt: new Date()
  },
  memoryOutput: {
    userPreferences: {},
    conversationHistory: []
  },
  conversationHistory: [
    { askedQuestions: ['budget'] },
    { askedQuestions: ['interests'] },
    { askedQuestions: ['relationship'] }
  ]
};

try {
  const output = await agent.process(input);
  console.log('Mode:', output.mode);
  console.log('Reasoning:', output.reasoning);
  console.log('Fallback reason:', output.fallbackReason);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
