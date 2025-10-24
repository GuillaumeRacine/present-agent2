# Multi-Model Agent System

How to use different LLM models for different agents in Present-Agent2.

## 🎯 Strategy: Model Selection by Agent Role

### Recommended Model Assignment

| Agent | Recommended Model | Why |
|-------|------------------|-----|
| **Product Manager** | Claude Sonnet 3.5 | Best at strategic thinking, research synthesis, nuanced product decisions |
| **Tickets Manager** | GPT-4 Turbo | Excellent at structured task breakdown, precise organization |
| **Engineering Manager** | Claude Sonnet 3.5 | Superior architectural reasoning, technical decision-making |
| **Coding Agent** | GPT-4 or Claude Sonnet | GPT-4 for Python/JS, Claude for complex logic |
| **Testing Agent** | GPT-3.5 Turbo | Cost-effective for test execution, bug reporting |
| **User Simulation** | Claude Haiku/GPT-3.5 | Fast, cheap for persona simulation |

### Cost vs Quality Trade-offs

**High Stakes (Use Premium Models):**
- Architecture decisions → Claude Sonnet 3.5
- Complex algorithms → Claude Sonnet 3.5 or GPT-4
- Product strategy → Claude Sonnet 3.5

**Medium Stakes (Use Mid-tier):**
- Code implementation → GPT-4 Turbo
- Task organization → GPT-4 Turbo
- Technical reviews → Claude Sonnet

**Low Stakes (Use Fast/Cheap):**
- Test execution → GPT-3.5 Turbo
- Bug reporting → GPT-3.5 Turbo
- User simulation → Claude Haiku or GPT-3.5

## 🛠️ Implementation Options

### Option 1: External Agent Scripts (Recommended)

Create standalone scripts that use OpenAI/Anthropic APIs directly:

```typescript
// scripts/agents/product-manager-agent.ts
import Anthropic from '@anthropic-ai/sdk';
import { readIssue, commentOnIssue } from './github-utils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function productManagerResearch(issueNumber: number) {
  const issue = await readIssue(issueNumber);

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: `You are the Product Manager agent. Research: ${issue.title}\n\n${issue.body}`
    }]
  });

  await commentOnIssue(issueNumber, message.content[0].text);
}
```

```typescript
// scripts/agents/coding-agent.ts
import OpenAI from 'openai';
import { readIssue, commentOnIssue } from './github-utils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function codingAgentImplement(issueNumber: number) {
  const issue = await readIssue(issueNumber);

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{
      role: "system",
      content: "You are the Coding Agent. Follow TypeScript strict mode..."
    }, {
      role: "user",
      content: `Implement: ${issue.title}\n\n${issue.body}`
    }]
  });

  await commentOnIssue(issueNumber, response.choices[0].message.content);
}
```

### Option 2: Model Router Function

Create a utility that routes to appropriate model:

```typescript
// src/lib/model-router.ts
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

type AgentRole = 'product-manager' | 'tickets-manager' | 'engineering-manager'
  | 'coding-agent' | 'testing-agent' | 'user-simulator';

const MODEL_CONFIG: Record<AgentRole, { provider: 'anthropic' | 'openai', model: string }> = {
  'product-manager': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  'tickets-manager': { provider: 'openai', model: 'gpt-4-turbo-preview' },
  'engineering-manager': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  'coding-agent': { provider: 'openai', model: 'gpt-4-turbo-preview' },
  'testing-agent': { provider: 'openai', model: 'gpt-3.5-turbo' },
  'user-simulator': { provider: 'anthropic', model: 'claude-3-haiku-20240307' }
};

export async function callAgent(
  role: AgentRole,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = MODEL_CONFIG[role];

  if (config.provider === 'anthropic') {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: config.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });
    return message.content[0].text;
  } else {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
    return response.choices[0].message.content!;
  }
}
```

### Option 3: Agent Workflow Orchestrator

Full automation script that runs the entire workflow:

```typescript
// scripts/run-agent-workflow.ts
import { callAgent } from '../src/lib/model-router';
import { readIssue, commentOnIssue, readFile } from './utils';

async function runFullWorkflow(featureRequest: string) {
  const issueNumber = await createIssue(`[FEATURE] ${featureRequest}`);

  // 1. Product Manager (Claude) - Research
  const pmSystemPrompt = await readFile('.claude/agents/product-manager.md');
  const research = await callAgent(
    'product-manager',
    pmSystemPrompt,
    `Research and create spec for: ${featureRequest}`
  );
  await commentOnIssue(issueNumber, `## Product Manager - Research\n\n${research}`);

  // 2. Tickets Manager (GPT-4) - Review
  const tmSystemPrompt = await readFile('.claude/agents/tickets-manager.md');
  const review = await callAgent(
    'tickets-manager',
    tmSystemPrompt,
    `Review this spec:\n\n${research}`
  );
  await commentOnIssue(issueNumber, `## Tickets Manager - Review\n\n${review}`);

  // 3. Engineering Manager (Claude) - Technical Review
  const emSystemPrompt = await readFile('.claude/agents/engineering-manager.md');
  const techReview = await callAgent(
    'engineering-manager',
    emSystemPrompt,
    `Technical review:\n\n${research}\n\n${review}`
  );
  await commentOnIssue(issueNumber, `## Engineering Manager - Review\n\n${techReview}`);

  // 4. Coding Agent (GPT-4) - Implement
  const caSystemPrompt = await readFile('.claude/agents/architect.md');
  const implementation = await callAgent(
    'coding-agent',
    caSystemPrompt,
    `Implement:\n\n${techReview}`
  );
  await commentOnIssue(issueNumber, `## Coding Agent - Implementation\n\n${implementation}`);

  // 5. Testing Agent (GPT-3.5) - Test
  const taSystemPrompt = await readFile('.claude/agents/testing-agent.md');
  const testResults = await callAgent(
    'testing-agent',
    taSystemPrompt,
    `Test this implementation:\n\n${implementation}`
  );
  await commentOnIssue(issueNumber, `## Testing Agent - Results\n\n${testResults}`);

  // 6. User Simulator (Claude Haiku) - Validate
  const usSystemPrompt = await readFile('.claude/agents/user-simulator.md');
  const uxValidation = await callAgent(
    'user-simulator',
    usSystemPrompt,
    `Validate UX:\n\n${implementation}`
  );
  await commentOnIssue(issueNumber, `## User Simulation - Validation\n\n${uxValidation}`);

  console.log(`✅ Workflow complete! Issue #${issueNumber}`);
}

// Usage
runFullWorkflow("Core Recommendation Engine");
```

## 💰 Cost Optimization

### Estimated Costs Per Feature (Full Workflow)

| Agent | Model | Tokens | Cost |
|-------|-------|--------|------|
| Product Manager | Claude Sonnet 3.5 | ~8K | $0.06 |
| Tickets Manager | GPT-4 Turbo | ~4K | $0.04 |
| Engineering Manager | Claude Sonnet 3.5 | ~10K | $0.08 |
| Coding Agent | GPT-4 Turbo | ~12K | $0.12 |
| Testing Agent | GPT-3.5 Turbo | ~6K | $0.01 |
| User Simulator | Claude Haiku | ~8K | $0.01 |

**Total per feature:** ~$0.32

**For 10 features:** ~$3.20

### Cost Reduction Strategies

1. **Use cheaper models for simple tasks**
   - User simulation → Claude Haiku ($0.25/1M input)
   - Testing → GPT-3.5 Turbo ($0.50/1M input)

2. **Cache prompts** (Claude supports prompt caching)
   ```typescript
   const message = await anthropic.messages.create({
     model: "claude-3-5-sonnet-20241022",
     system: [
       {
         type: "text",
         text: systemPrompt,
         cache_control: { type: "ephemeral" }  // Cache this!
       }
     ],
     messages: [...]
   });
   ```

3. **Batch operations** when possible

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @anthropic-ai/sdk openai @octokit/rest
```

### 2. Configure Environment

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
```

### 3. Create Agent Runner

```bash
# Run full workflow
npm run agent-workflow "Build recommendation engine"

# Run specific agent
npm run agent product-manager issue-8
npm run agent coding-agent issue-8
```

### 4. Add to package.json

```json
{
  "scripts": {
    "agent-workflow": "tsx scripts/run-agent-workflow.ts",
    "agent": "tsx scripts/run-single-agent.ts"
  }
}
```

## 🎯 Hybrid Approach: Claude Code + External Scripts

**Best of both worlds:**

1. **Use Claude Code** (current setup) for interactive development
2. **Use external scripts** for automated workflows

```bash
# Interactive (Claude Code - you control)
"Use the product-manager agent to research X"

# Automated (External script - fully automated)
npm run agent-workflow "Build feature X"
```

## 📊 Model Performance by Task

Based on testing:

| Task Type | Best Model | Why |
|-----------|-----------|-----|
| Strategic planning | Claude Sonnet 3.5 | Superior reasoning |
| Code generation | GPT-4 Turbo | Faster, good quality |
| Task breakdown | GPT-4 Turbo | Very structured |
| Architecture design | Claude Sonnet 3.5 | Nuanced decisions |
| Bug investigation | GPT-4 | Good at analysis |
| Test generation | GPT-3.5/4 | Pattern-based |
| UX simulation | Claude Haiku | Fast, conversational |

## 🔄 Integration with Current Setup

Your current Claude Code agents can **call these external scripts**:

```markdown
# In .claude/agents/product-manager.md

When running automated workflows, you can execute:

\`\`\`bash
tsx scripts/agents/product-manager.ts issue-8
\`\`\`

This will use Claude Sonnet 3.5 directly for research.
```

## ⚠️ Important Considerations

1. **Context Management**: Different models have different context windows
   - Claude Sonnet: 200K tokens
   - GPT-4 Turbo: 128K tokens
   - GPT-3.5: 16K tokens

2. **Prompt Compatibility**: Test prompts across models (they respond differently)

3. **API Rate Limits**: Monitor usage across providers

4. **Consistency**: Document which model is used for each agent role

## 🎉 Recommended Setup

**For your use case (Present-Agent2):**

```typescript
// Recommended model assignments
const AGENTS = {
  'product-manager': 'claude-3-5-sonnet-20241022',     // Strategic
  'tickets-manager': 'gpt-4-turbo-preview',            // Structured
  'engineering-manager': 'claude-3-5-sonnet-20241022', // Architecture
  'coding-agent': 'gpt-4-turbo-preview',               // Implementation
  'testing-agent': 'gpt-3.5-turbo',                    // Cost-effective
  'user-simulator': 'claude-3-haiku-20240307'          // Fast/cheap
};
```

Want me to implement the multi-model agent system for you?
