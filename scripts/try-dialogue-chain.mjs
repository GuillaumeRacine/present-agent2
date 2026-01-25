// Quick chain: DialogueManager -> DialoguePresenter
// Run with: node --loader tsx scripts/try-dialogue-chain.mjs

import { DialogueManagerAgent } from '../src/services/agents/dialogue-manager.ts';
import { DialoguePresenterAgent, detectUserContext } from '../src/services/agents/dialogue-presenter.ts';

const dm = new DialogueManagerAgent();
const presenter = new DialoguePresenterAgent();

const listenerOutput = {
  userQuery: 'Need a gift for my friend',
  confidence: 0.45,
  interests: [],
  extractedAt: new Date(),
};

const input = {
  listenerOutput,
  memoryOutput: { userPreferences: {}, conversationHistory: [] },
  conversationHistory: [],
};

const decision = await dm.process(input);
console.log('\n--- DialogueManager Decision ---');
console.log('Mode:', decision.mode);
console.log('Reasoning:', decision.reasoning);
if (decision.mode === 'ask') {
  console.log('Questions:', decision.questions.map(q => q.id).join(', '));
}

const userContext = detectUserContext(listenerOutput);
const presented = await presenter.process({
  dialogueOutput: decision,
  userContext,
  conversationHistory: [],
});

console.log('\n--- DialoguePresenter Output ---');
console.log(presented.naturalLanguage);
if (presented.encouragement) console.log('\nEncouragement:', presented.encouragement);
console.log('\n-------------------------------\n');

