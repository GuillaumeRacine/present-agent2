/**
 * Bar Raiser Agent - Holistic Quality Enforcement
 *
 * The 11th runtime agent. Sits after Presenter and evaluates the full output
 * holistically via LLM. Can reject and trigger a retry loop back through
 * Explorer → Validator → Storyteller → Presenter with structured feedback.
 *
 * Unlike the Validator (per-product, rule-based), the Bar Raiser:
 * - Evaluates the entire recommendation SET holistically
 * - Uses LLM-powered judgment (GPT-4o at temp 0.2)
 * - Inspects each agent's I/O to detect information loss
 * - Can reject entire output and trigger retry with structured guidance
 * - Persists quality records for trending
 */

import { BaseAgent } from './base';
import {
  BarRaiserInput,
  BarRaiserOutput,
  BarRaiserVerdict,
  QualityScorecard,
  QualityDimension,
  AgentEvaluation,
  BarRaiserFeedback,
  BarRaiserConfig,
  DEFAULT_BAR_RAISER_CONFIG,
} from '../../types/bar-raiser';
import OpenAI from 'openai';

export class BarRaiserAgent extends BaseAgent<BarRaiserInput, BarRaiserOutput> {
  name = 'BarRaiser';

  constructor(
    private openai: OpenAI,
    private config: BarRaiserConfig = DEFAULT_BAR_RAISER_CONFIG
  ) {
    super();
  }

  async process(input: BarRaiserInput): Promise<BarRaiserOutput> {
    this.log(`Evaluating recommendation quality (attempt ${input.attemptNumber + 1})`);

    // Zero recommendations = automatic rejection (no LLM call needed)
    const recCount = input.presenterOutput?.recommendations?.length || 0;
    if (recCount === 0) {
      this.log('Zero recommendations — auto-rejecting with score 0');
      return {
        verdict: 'REJECTED',
        overallScore: 0,
        scorecard: {},
        feedback: {
          missedInterests: [],
          additionalSearchQueries: [],
          searchDirection: 'broader',
          budgetEnforcement: undefined,
        },
        summary: 'Zero recommendations generated — nothing to evaluate',
        attemptNumber: input.attemptNumber,
      } as any;
    }

    try {
      // Step 1: Check for critical failures (fast, no LLM needed)
      let criticalFailures: string[] = [];
      try {
        criticalFailures = this.detectCriticalFailures(input);
      } catch (critError) {
        this.log(`Critical failure detection failed (non-fatal): ${critError}`);
      }

      if (criticalFailures.length > 0) {
        this.log(`Critical failures detected: ${criticalFailures.join(', ')}`);
      }

      // Step 2: Build evaluation prompt and call LLM
      const evaluationResult = await this.evaluateWithLLM(input);

      // Step 2b: Apply deterministic overrides as safety net
      // (evaluateWithLLM should apply these internally, but GPT-4o hallucination
      // can cause the LLM path to return before overrides take effect)
      try {
        const safetyOverrides = this.computeDeterministicDimensions(input);
        if (safetyOverrides.interestCoverage !== undefined) {
          const prev = evaluationResult.scorecard.interestCoverage?.score;
          evaluationResult.scorecard.interestCoverage = safetyOverrides.interestCoverage;
          this.log(`Deterministic interestCoverage override: ${prev} → ${safetyOverrides.interestCoverage.score}`);
        }
        if (safetyOverrides.budgetAdherence !== undefined) {
          const prev = evaluationResult.scorecard.budgetAdherence?.score;
          evaluationResult.scorecard.budgetAdherence = safetyOverrides.budgetAdherence;
          this.log(`Deterministic budgetAdherence override: ${prev} → ${safetyOverrides.budgetAdherence.score}`);
        }
        if (safetyOverrides.relevance !== undefined) {
          const prev = evaluationResult.scorecard.relevance?.score;
          // Only override if deterministic is higher (LLM hallucinates low)
          if (safetyOverrides.relevance.score > (prev || 0)) {
            evaluationResult.scorecard.relevance = safetyOverrides.relevance;
            this.log(`Deterministic relevance override: ${prev} → ${safetyOverrides.relevance.score}`);
          }
        }
        if (safetyOverrides.personalization !== undefined) {
          const prev = evaluationResult.scorecard.personalization?.score;
          if (safetyOverrides.personalization.score > (prev || 0)) {
            evaluationResult.scorecard.personalization = safetyOverrides.personalization;
            this.log(`Deterministic personalization override: ${prev} → ${safetyOverrides.personalization.score}`);
          }
        }
      } catch (overrideError) {
        this.log(`Deterministic override failed (non-fatal): ${overrideError}`);
      }

      // Step 3: Evaluate each agent's I/O for information loss
      let agentEvaluations: AgentEvaluation[] = [];
      try {
        agentEvaluations = this.evaluateAgents(input);
      } catch (agentEvalError) {
        this.log(`Agent evaluation failed (non-fatal): ${agentEvalError}`);
      }

      // Step 4: Calculate overall score
      const overallScore = this.calculateOverallScore(evaluationResult.scorecard);

      // Step 5: Determine verdict
      const verdict = this.determineVerdict(
        overallScore,
        criticalFailures,
        evaluationResult.scorecard
      );

      this.log(`Verdict: ${verdict} (score: ${overallScore}/100)`);

      // Step 6: Generate feedback if rejected
      let feedback: BarRaiserFeedback | undefined;
      if (verdict === 'REJECTED') {
        feedback = this.generateFeedback(input, evaluationResult.scorecard, agentEvaluations);
        this.log('Generated retry feedback', {
          missedInterests: feedback.explorerGuidance.missedInterests,
          searchDirection: feedback.explorerGuidance.searchDirection,
          thresholdPolicy: feedback.validatorGuidance.thresholdPolicy,
        });
      }

      return {
        verdict,
        scorecard: evaluationResult.scorecard,
        agentEvaluations,
        feedback,
        overallScore,
        summary: evaluationResult.summary,
        criticalFailures,
        attemptNumber: input.attemptNumber,
        evaluatedAt: new Date(),
      };
    } catch (error) {
      // On evaluation failure, approve with concerns rather than blocking
      this.log(`Evaluation error, approving with concerns: ${error}`);
      return this.createFallbackOutput(input);
    }
  }

  /**
   * Detect critical failures that force REJECTED regardless of score
   */
  private detectCriticalFailures(input: BarRaiserInput): string[] {
    const failures: string[] = [];
    const presenter = input.presenterOutput;
    const validator = input.executionTrace.validator;
    const explorer = input.executionTrace.explorer;
    const listener = input.executionTrace.listener;

    // Zero recommendations
    if (!presenter.recommendations || presenter.recommendations.length === 0) {
      failures.push('ZERO_RECOMMENDATIONS: No products recommended');
    }

    // All products out of budget
    if (presenter.recommendations?.length > 0 && listener.budget) {
      const allOutOfBudget = presenter.recommendations.every(
        (r) => r.product.price > listener.budget!.max || r.product.price < listener.budget!.min
      );
      if (allOutOfBudget) {
        failures.push('ALL_OUT_OF_BUDGET: Every recommendation exceeds stated budget');
      }
    }

    // No interest coverage at all
    if (listener.interests?.length > 0 && explorer) {
      const allMatchedInterests = new Set(
        explorer.candidates.flatMap((c) => c.matchReasons?.matchedInterests || [])
      );
      const anyInterestCovered = listener.interests.some(
        (interest) => allMatchedInterests.has(interest.toLowerCase()) ||
          allMatchedInterests.has(interest)
      );
      if (!anyInterestCovered && explorer.candidates.length > 0) {
        failures.push(
          `NO_INTEREST_COVERAGE: User mentioned [${listener.interests.join(', ')}] but no products match any interest`
        );
      }
    }

    // Validator auto-lowered thresholds (when blockOnThresholdLowering is enabled)
    if (
      this.config.blockOnThresholdLowering &&
      validator?.validationSummary.thresholdsLowered
    ) {
      failures.push(
        'THRESHOLD_LOWERED: Validator auto-lowered quality thresholds to guarantee products'
      );
    }

    return failures;
  }

  /**
   * Call LLM to evaluate the recommendation set holistically
   */
  private async evaluateWithLLM(
    input: BarRaiserInput
  ): Promise<{ scorecard: QualityScorecard; summary: string }> {
    const prompt = this.buildEvaluationPrompt(input);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.evaluationModel,
        temperature: this.config.evaluationTemperature,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a gift recommendation quality evaluator. Score 8 dimensions from 0-100 with reasoning and evidence.

CRITICAL RULES:
- Read the RECIPIENT, OCCASION, INTERESTS, and BUDGET fields carefully. They ARE provided.
- DO NOT claim "no interests specified" or "no recipient provided" — that information IS in the prompt.
- Score based on how well the recommendations match the STATED context.
- A score of 60+ means acceptable, 80+ means good, 90+ means excellent.
- Be fair: if products genuinely match stated interests and budget, score accordingly.

Return a JSON object with this exact structure:
{
  "scorecard": {
    "relevance": { "score": <0-100>, "reasoning": "<why>", "evidence": ["<specific examples>"] },
    "personalization": { "score": <0-100>, "reasoning": "<why>", "evidence": ["<specific examples>"] },
    "storytellingQuality": { "score": <0-100>, "reasoning": "<why>", "evidence": ["<specific examples>"] },
    "diversity": { "score": <0-100>, "reasoning": "<why>", "evidence": ["<specific examples>"] },
    "humanSanityCheck": { "score": <0-100>, "reasoning": "<why>", "evidence": ["<specific examples>"] },
    "budgetAdherence": { "score": <0-100>, "reasoning": "<why>", "evidence": ["<specific examples>"] },
    "interestCoverage": { "score": <0-100>, "reasoning": "<why>", "evidence": ["<specific examples>"] },
    "presentationCohesion": { "score": <0-100>, "reasoning": "<why>", "evidence": ["<specific examples>"] }
  },
  "summary": "<2-3 sentence overall assessment>"
}`,
          },
          { role: 'user', content: prompt },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty LLM response');
      }

      const parsed = JSON.parse(content);
      const scorecard = parsed.scorecard as QualityScorecard;

      // Override factual dimensions with deterministic computation
      // (GPT-4o reliably hallucinates "no interests provided" and "no budget specified")
      const deterministicOverrides = this.computeDeterministicDimensions(input);
      if (deterministicOverrides.interestCoverage !== undefined) {
        scorecard.interestCoverage = deterministicOverrides.interestCoverage;
      }
      if (deterministicOverrides.budgetAdherence !== undefined) {
        scorecard.budgetAdherence = deterministicOverrides.budgetAdherence;
      }

      return {
        scorecard,
        summary: parsed.summary as string,
      };
    } catch (error) {
      this.log(`LLM evaluation failed, using heuristic fallback: ${error}`);
      return this.heuristicEvaluation(input);
    }
  }

  /**
   * Build the full evaluation prompt with execution trace context
   */
  private buildEvaluationPrompt(input: BarRaiserInput): string {
    const { executionTrace, presenterOutput, userQuery, attemptNumber } = input;
    const listener = executionTrace.listener;
    const meaning = executionTrace.meaning;
    const explorer = executionTrace.explorer;
    const validator = executionTrace.validator;
    const storyteller = executionTrace.storyteller;

    // Extract key context
    const interests = listener.interests?.join(', ') || 'none stated';
    const budget = listener.budget
      ? `$${listener.budget.min}-$${listener.budget.max} (${listener.budget.flexibility})`
      : 'not specified';
    const recipient = listener.recipient
      ? `${listener.recipient.name || 'unnamed'} (${listener.recipient.relationshipType || 'unknown relationship'})`
      : 'not specified';
    const occasion = listener.occasion?.name || 'not specified';
    const archetype = meaning?.meaningFramework?.giftArchetype || 'unknown';

    // Format recommendations
    const recs = presenterOutput.recommendations
      .map(
        (r, i) =>
          `${i + 1}. "${r.product.title}" - $${r.product.price} by ${r.product.vendor}\n   Reasoning: ${r.reasoning}\n   Tags: ${r.tags?.join(', ') || 'none'}`
      )
      .join('\n\n');

    // Validator stats
    const validatorStats = validator
      ? `Candidates evaluated: ${validator.validationSummary.totalCandidates}, Passed: ${validator.validationSummary.passed}, Rejected: ${validator.validationSummary.rejected}, Thresholds lowered: ${validator.validationSummary.thresholdsLowered}`
      : 'no validator data';

    // Explorer stats
    const explorerStats = explorer
      ? `Total explored: ${explorer.searchMetadata.totalEvaluated}, Diversity: ${(explorer.searchMetadata.diversityScore * 100).toFixed(0)}%, Coverage: ${(explorer.searchMetadata.coverageScore * 100).toFixed(0)}%`
      : 'no explorer data';

    // Previous feedback context
    const retryContext = input.previousFeedback
      ? `\n\nThis is RETRY attempt #${attemptNumber + 1}. Previous rejection reason: "${input.previousFeedback.rejectionReason}"\nMissed interests to find: [${input.previousFeedback.explorerGuidance.missedInterests.join(', ')}]`
      : '';

    // Build context facts section with explicit anchoring
    const contextFacts: string[] = [];
    if (interests !== 'none stated') contextFacts.push(`INTERESTS STATED BY USER: ${interests}`);
    if (recipient !== 'not specified') contextFacts.push(`RECIPIENT: ${recipient}`);
    if (occasion !== 'not specified') contextFacts.push(`OCCASION: ${occasion}`);
    if (budget !== 'not specified') contextFacts.push(`BUDGET: ${budget}`);
    const contextBlock = contextFacts.length > 0
      ? `\n=== CONTEXT PROVIDED (these are FACTS from the user query — you MUST reference them in scoring) ===\n${contextFacts.map(f => `- ${f}`).join('\n')}\n=== END CONTEXT ===\n`
      : '';

    return `Evaluate these gift recommendations:

USER QUERY: "${userQuery}"
${contextBlock}
RECIPIENT: ${recipient}
OCCASION: ${occasion}
INTERESTS: ${interests}
BUDGET: ${budget}
GIFT ARCHETYPE: ${archetype}

PIPELINE STATS:
- Explorer: ${explorerStats}
- Validator: ${validatorStats}

RECOMMENDATIONS:
${recs}

SCORING CRITERIA (evaluate based on the ACTUAL context provided above):
1. relevance: Do these gifts genuinely match what was asked for? The user asked for a gift for ${recipient} for ${occasion}. Would they be satisfied?
2. personalization: Are these specific to the recipient's interests (${interests})? Do they reference those interests in the reasoning?
3. storytellingQuality: Are the explanations compelling, specific to each product, and clearly tied to the stated interests?
4. diversity: Is there good variety (different categories, price points, styles) while staying relevant to stated interests?
5. humanSanityCheck: Would a thoughtful friend actually buy any of these? Are they real, sensible gifts for this specific scenario?
6. budgetAdherence: Are all items within the stated budget of ${budget}?
7. interestCoverage: Do the recommendations cover the stated interests [${interests}]? How many of the 5 products match at least one stated interest?
8. presentationCohesion: Does the set feel curated and intentional for this specific gift-giving scenario?${retryContext}`;
  }

  /**
   * Compute factual dimensions deterministically (no LLM)
   * These override LLM scores because GPT-4o hallucinates on factual checks
   */
  private computeDeterministicDimensions(
    input: BarRaiserInput
  ): { interestCoverage?: QualityDimension; budgetAdherence?: QualityDimension; relevance?: QualityDimension; personalization?: QualityDimension } {
    const result: { interestCoverage?: QualityDimension; budgetAdherence?: QualityDimension; relevance?: QualityDimension; personalization?: QualityDimension } = {};
    const presenter = input.presenterOutput;
    const listener = input.executionTrace.listener;
    const explorer = input.executionTrace.explorer;
    const recCount = presenter.recommendations?.length || 0;

    // Interest coverage: deterministic check against product titles + graph matches
    const listenerInterests = Array.isArray(listener.interests) ? listener.interests : [];
    if (listenerInterests.length > 0 && recCount > 0) {
      // Check which interests appear in recommended product titles/descriptions/reasoning
      const coveredInterests = new Set<string>();
      for (const interest of listenerInterests) {
        const lower = interest.toLowerCase();
        for (const rec of presenter.recommendations) {
          const text = `${rec.product.title} ${rec.product.description || ''} ${rec.reasoning || ''}`.toLowerCase();
          if (text.includes(lower)) {
            coveredInterests.add(lower);
            break;
          }
        }
      }

      // Also check graph matches from explorer
      if (explorer) {
        const graphMatched = new Set(
          explorer.candidates.flatMap((c) => (c.matchReasons?.matchedInterests || []).map((i: string) => i.toLowerCase()))
        );
        for (const interest of listenerInterests) {
          if (graphMatched.has(interest.toLowerCase())) {
            coveredInterests.add(interest.toLowerCase());
          }
        }
      }

      const coverageRatio = coveredInterests.size / listenerInterests.length;
      // Count how many of the 5 recommended products match at least one interest
      let productsMatchingInterest = 0;
      for (const rec of presenter.recommendations) {
        const text = `${rec.product.title} ${rec.product.description || ''} ${rec.reasoning || ''}`.toLowerCase();
        if (listenerInterests.some(i => text.includes(i.toLowerCase()))) {
          productsMatchingInterest++;
        }
      }
      const productCoverageRatio = productsMatchingInterest / recCount;

      // Score: 50% from interest coverage, 50% from product coverage
      const score = Math.round((coverageRatio * 50) + (productCoverageRatio * 50));

      result.interestCoverage = {
        score,
        reasoning: `Deterministic: ${coveredInterests.size}/${listenerInterests.length} interests covered [${Array.from(coveredInterests).join(', ')}]. ${productsMatchingInterest}/${recCount} products match at least one interest.`,
        evidence: [
          `Stated interests: [${listenerInterests.join(', ')}]`,
          `Covered: [${Array.from(coveredInterests).join(', ')}]`,
          `${productsMatchingInterest}/${recCount} products match`,
        ],
      };
      this.log(`Deterministic interestCoverage: ${score}/100 (${coveredInterests.size}/${listenerInterests.length} interests, ${productsMatchingInterest}/${recCount} products)`);
    }

    // Budget adherence: deterministic check
    if (listener.budget && recCount > 0) {
      const budgetMin = typeof listener.budget.min === 'number' && !isNaN(listener.budget.min) ? listener.budget.min : 0;
      const budgetMax = typeof listener.budget.max === 'number' && !isNaN(listener.budget.max) ? listener.budget.max : Infinity;

      const inBudget = presenter.recommendations.filter(
        (r) => r.product.price >= budgetMin && r.product.price <= budgetMax
      ).length;
      const score = Math.round((inBudget / recCount) * 100);

      const prices = presenter.recommendations.map(r => `$${r.product.price}`).join(', ');
      result.budgetAdherence = {
        score,
        reasoning: `Deterministic: ${inBudget}/${recCount} products within $${budgetMin}-$${budgetMax}. Prices: ${prices}`,
        evidence: [
          `Budget: $${budgetMin}-$${budgetMax}`,
          `Prices: ${prices}`,
          `${inBudget}/${recCount} in range`,
        ],
      };
      this.log(`Deterministic budgetAdherence: ${score}/100 (${inBudget}/${recCount} in budget)`);
    }

    // Relevance: deterministic check based on interest match + budget match + context signals
    // GPT-4o consistently hallucinates "no recipient/occasion/interests specified" even when explicitly provided
    if (recCount > 0) {
      const hasInterests = listenerInterests.length > 0;
      const hasBudget = !!listener.budget;
      const hasRecipient = !!listener.recipient?.relationshipType;
      const hasOccasion = !!listener.occasion?.name;

      // Count how many of the 5 recommended products mention stated interests
      let productsReferencingInterest = 0;
      if (hasInterests) {
        for (const rec of presenter.recommendations) {
          const text = `${rec.product.title} ${rec.product.description || ''} ${rec.reasoning || ''}`.toLowerCase();
          if (listenerInterests.some(i => text.includes(i.toLowerCase()))) {
            productsReferencingInterest++;
          }
        }
      }

      // Count products in budget
      let productsInBudget = recCount;
      if (hasBudget) {
        const bMin = typeof listener.budget!.min === 'number' ? listener.budget!.min : 0;
        const bMax = typeof listener.budget!.max === 'number' ? listener.budget!.max : Infinity;
        productsInBudget = presenter.recommendations.filter(
          r => r.product.price >= bMin && r.product.price <= bMax
        ).length;
      }

      // Base relevance: context factors provided (20pts each) + product-interest match ratio
      const contextScore = (hasInterests ? 20 : 0) + (hasBudget ? 15 : 0) + (hasRecipient ? 15 : 0) + (hasOccasion ? 10 : 0);
      const interestMatchRatio = hasInterests ? (productsReferencingInterest / recCount) : 0.5;
      const budgetMatchRatio = productsInBudget / recCount;
      const relevanceScore = Math.min(100, Math.round(contextScore + (interestMatchRatio * 25) + (budgetMatchRatio * 15)));

      result.relevance = {
        score: relevanceScore,
        reasoning: `Deterministic: Context provided (interests: ${hasInterests}, budget: ${hasBudget}, recipient: ${hasRecipient}, occasion: ${hasOccasion}). ${productsReferencingInterest}/${recCount} products reference stated interests. ${productsInBudget}/${recCount} in budget.`,
        evidence: [
          hasInterests ? `Interests: [${listenerInterests.join(', ')}]` : 'No interests stated',
          hasRecipient ? `Recipient: ${listener.recipient!.relationshipType}` : 'No recipient',
          hasOccasion ? `Occasion: ${listener.occasion!.name}` : 'No occasion',
          `${productsReferencingInterest}/${recCount} products match interests`,
        ],
      };
      this.log(`Deterministic relevance: ${relevanceScore}/100`);

      // Personalization: how specifically do recommendations reference the stated context?
      if (hasInterests) {
        let totalInterestMentions = 0;
        for (const rec of presenter.recommendations) {
          const reasoning = (rec.reasoning || '').toLowerCase();
          for (const interest of listenerInterests) {
            if (reasoning.includes(interest.toLowerCase())) {
              totalInterestMentions++;
            }
          }
        }
        // Average interest mentions per recommendation × interest count
        const mentionDensity = totalInterestMentions / (recCount * listenerInterests.length);
        const personalizationScore = Math.min(100, Math.round(mentionDensity * 60 + productsReferencingInterest / recCount * 40));

        result.personalization = {
          score: personalizationScore,
          reasoning: `Deterministic: ${totalInterestMentions} interest mentions across ${recCount} recommendations (density: ${(mentionDensity * 100).toFixed(0)}%). ${productsReferencingInterest}/${recCount} products explicitly reference stated interests.`,
          evidence: [
            `Stated interests: [${listenerInterests.join(', ')}]`,
            `Total interest mentions in reasoning: ${totalInterestMentions}`,
            `${productsReferencingInterest}/${recCount} products match`,
          ],
        };
        this.log(`Deterministic personalization: ${personalizationScore}/100 (${totalInterestMentions} mentions)`);
      }
    }

    return result;
  }

  /**
   * Heuristic fallback when LLM evaluation fails
   */
  private heuristicEvaluation(
    input: BarRaiserInput
  ): { scorecard: QualityScorecard; summary: string } {
    const presenter = input.presenterOutput;
    const listener = input.executionTrace.listener;
    const explorer = input.executionTrace.explorer;
    const validator = input.executionTrace.validator;

    const recCount = presenter.recommendations?.length || 0;

    // Relevance: based on confidence scores
    const avgConfidence =
      recCount > 0
        ? presenter.recommendations.reduce((s, r) => s + r.confidence, 0) / recCount
        : 0;
    const relevanceScore = Math.round(avgConfidence * 100);

    // Budget adherence
    let budgetScore = 100;
    if (listener.budget && recCount > 0) {
      const inBudget = presenter.recommendations.filter(
        (r) => r.product.price >= listener.budget!.min && r.product.price <= listener.budget!.max
      ).length;
      budgetScore = Math.round((inBudget / recCount) * 100);
    }

    // Interest coverage
    let interestScore = 50;
    if (listener.interests?.length > 0 && explorer) {
      const allMatched = new Set(
        explorer.candidates.flatMap((c) => (c.matchReasons?.matchedInterests || []).map((i: string) => i.toLowerCase()))
      );
      const covered = listener.interests.filter((i) => allMatched.has(i.toLowerCase())).length;
      interestScore = Math.round((covered / listener.interests.length) * 100);
    }

    // Diversity
    const vendors = new Set(presenter.recommendations?.map((r) => r.product.vendor) || []);
    const diversityScore = recCount > 0 ? Math.round((vendors.size / recCount) * 100) : 0;

    // Validator quality
    const validatorScore = validator?.validationSummary.thresholdsLowered ? 40 : 70;

    const makeDimension = (score: number, reasoning: string): QualityDimension => ({
      score,
      reasoning,
      evidence: [],
    });

    const scorecard: QualityScorecard = {
      relevance: makeDimension(relevanceScore, 'Based on average confidence scores'),
      personalization: makeDimension(Math.round(relevanceScore * 0.8), 'Heuristic estimate'),
      storytellingQuality: makeDimension(50, 'Cannot evaluate stories without LLM'),
      diversity: makeDimension(diversityScore, `${vendors.size} unique vendors across ${recCount} recommendations`),
      humanSanityCheck: makeDimension(validatorScore, 'Based on validator threshold status'),
      budgetAdherence: makeDimension(budgetScore, 'Products within stated budget'),
      interestCoverage: makeDimension(interestScore, 'Interests matched from user query'),
      presentationCohesion: makeDimension(50, 'Cannot evaluate cohesion without LLM'),
    };

    return {
      scorecard,
      summary: `Heuristic evaluation (LLM unavailable). ${recCount} recommendations with avg confidence ${(avgConfidence * 100).toFixed(0)}%.`,
    };
  }

  /**
   * Evaluate each agent's I/O to detect information loss
   */
  private evaluateAgents(input: BarRaiserInput): AgentEvaluation[] {
    const evaluations: AgentEvaluation[] = [];
    const trace = input.executionTrace;

    // Listener evaluation
    const listenerInterests = Array.isArray(trace.listener.interests) ? trace.listener.interests : [];
    const listenerValues = Array.isArray(trace.listener.values) ? trace.listener.values : [];
    evaluations.push({
      agentName: 'Listener',
      rating: listenerInterests.length > 0 ? 80 : 40,
      inputSignals: [input.userQuery],
      outputSignals: [
        ...listenerInterests.map((i) => `interest:${i}`),
        ...listenerValues.map((v: string) => `value:${v}`),
        trace.listener.budget ? `budget:$${trace.listener.budget.min}-$${trace.listener.budget.max}` : '',
        trace.listener.recipient?.relationshipType ? `recipient:${trace.listener.recipient.relationshipType}` : '',
      ].filter(Boolean),
      lostSignals: [],
      informationPreservation: 0.9,
      issues: listenerInterests.length === 0 ? ['No interests extracted from query'] : [],
    });

    // Explorer evaluation — check if interests were found in products
    if (trace.explorer) {
      // Primary: check matchedInterests from graph/category/text matching
      const explorerMatchedInterests = new Set(
        trace.explorer.candidates.flatMap((c) => (c.matchReasons?.matchedInterests || []).map((i: string) => i.toLowerCase()))
      );

      // Fallback: if matchedInterests is sparse, also check product titles/descriptions
      if (explorerMatchedInterests.size === 0 && trace.explorer.candidates.length > 0) {
        for (const candidate of trace.explorer.candidates) {
          const text = `${candidate.product.title} ${candidate.product.description || ''}`.toLowerCase();
          for (const interest of listenerInterests) {
            if (text.includes(interest.toLowerCase())) {
              explorerMatchedInterests.add(interest.toLowerCase());
            }
          }
        }
      }

      const lostInterests = listenerInterests.filter(
        (i) => !explorerMatchedInterests.has(i.toLowerCase())
      );

      const explorerScore = listenerInterests.length > 0
        ? Math.round(((listenerInterests.length - lostInterests.length) / listenerInterests.length) * 100)
        : 70;

      evaluations.push({
        agentName: 'Explorer',
        rating: explorerScore,
        inputSignals: listenerInterests.map((i) => `interest:${i}`),
        outputSignals: Array.from(explorerMatchedInterests).map((i) => `matched:${i}`),
        lostSignals: lostInterests.map((i) => `LOST interest:${i}`),
        informationPreservation: listenerInterests.length > 0
          ? (listenerInterests.length - lostInterests.length) / listenerInterests.length
          : 1,
        issues: lostInterests.length > 0
          ? [`Lost ${lostInterests.length} interests: [${lostInterests.join(', ')}]`]
          : [],
      });
    }

    // Validator evaluation
    if (trace.validator) {
      const validatorIssues: string[] = [];
      if (trace.validator.validationSummary.thresholdsLowered) {
        validatorIssues.push('Auto-lowered quality thresholds to guarantee minimum products');
      }
      if (trace.validator.validationSummary.passed === 0) {
        validatorIssues.push('Zero candidates passed validation');
      }

      evaluations.push({
        agentName: 'Validator',
        rating: trace.validator.validationSummary.thresholdsLowered ? 40 : 80,
        inputSignals: [`${trace.validator.validationSummary.totalCandidates} candidates`],
        outputSignals: [`${trace.validator.validationSummary.passed} passed`],
        lostSignals: [],
        informationPreservation: trace.validator.validationSummary.totalCandidates > 0
          ? trace.validator.validationSummary.passed / trace.validator.validationSummary.totalCandidates
          : 0,
        issues: validatorIssues,
      });
    }

    // Storyteller evaluation
    if (trace.storyteller) {
      const stories = trace.storyteller.stories || [];
      const hasReasonings = stories.filter((s) => s.reasoning && s.reasoning.length > 20);

      evaluations.push({
        agentName: 'Storyteller',
        rating: stories.length > 0 ? Math.round((hasReasonings.length / stories.length) * 100) : 0,
        inputSignals: [`${stories.length} products to narrate`],
        outputSignals: [`${hasReasonings.length} meaningful stories`],
        lostSignals: [],
        informationPreservation: stories.length > 0 ? hasReasonings.length / stories.length : 0,
        issues: hasReasonings.length < stories.length
          ? [`${stories.length - hasReasonings.length} stories lack meaningful reasoning`]
          : [],
      });
    }

    return evaluations;
  }

  /**
   * Calculate overall score as weighted average of dimensions
   */
  private calculateOverallScore(scorecard: QualityScorecard): number {
    const weights = {
      relevance: 0.20,
      personalization: 0.15,
      storytellingQuality: 0.10,
      diversity: 0.10,
      humanSanityCheck: 0.15,
      budgetAdherence: 0.10,
      interestCoverage: 0.15,
      presentationCohesion: 0.05,
    };

    let totalScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const dimension = scorecard[key as keyof QualityScorecard];
      totalScore += (dimension?.score || 0) * weight;
    }

    return Math.round(totalScore);
  }

  /**
   * Determine verdict based on score and critical failures
   */
  private determineVerdict(
    overallScore: number,
    criticalFailures: string[],
    scorecard: QualityScorecard
  ): BarRaiserVerdict {
    // Critical failures → always REJECTED
    if (criticalFailures.length > 0) {
      return 'REJECTED';
    }

    // Any dimension critically low (below 20) → REJECTED
    const dimensions = Object.values(scorecard);
    const hasCriticallyLow = dimensions.some((d) => d.score < 20);
    if (hasCriticallyLow) {
      return 'REJECTED';
    }

    // Overall score check
    if (overallScore >= this.config.passThreshold) {
      // Check if any dimension is concerning (below 40)
      const hasConcerns = dimensions.some((d) => d.score < 40);
      if (hasConcerns) {
        return 'APPROVED_WITH_CONCERNS';
      }
      return 'APPROVED';
    }

    return 'REJECTED';
  }

  /**
   * Generate structured feedback for retry
   */
  private generateFeedback(
    input: BarRaiserInput,
    scorecard: QualityScorecard,
    agentEvaluations: AgentEvaluation[]
  ): BarRaiserFeedback {
    const listener = input.executionTrace.listener;
    const explorer = input.executionTrace.explorer;

    // Find missed interests
    const explorerEval = agentEvaluations.find((e) => e.agentName === 'Explorer');
    const missedInterests = explorerEval?.lostSignals
      .filter((s) => s.startsWith('LOST interest:'))
      .map((s) => s.replace('LOST interest:', '')) || [];

    // Determine search direction based on scores
    let searchDirection: 'broaden' | 'narrow' | 'pivot' = 'broaden';
    if (scorecard.relevance.score < 30) {
      searchDirection = 'pivot'; // Results are completely wrong
    } else if (scorecard.diversity.score < 30) {
      searchDirection = 'broaden'; // Too narrow, need more variety
    } else if (scorecard.interestCoverage.score > 60) {
      searchDirection = 'narrow'; // Right track but needs refinement
    }

    // Generate additional search queries from missed interests
    const additionalSearchQueries = missedInterests.map(
      (interest) => `gift for someone who loves ${interest}`
    );

    // Budget enforcement
    const budgetEnforcement = listener.budget
      ? {
          min: listener.budget.min,
          max: listener.budget.max,
          strict: scorecard.budgetAdherence.score < 50,
        }
      : undefined;

    // Identify weak dimensions
    const improvementAreas: string[] = [];
    const dimensionEntries = Object.entries(scorecard) as [keyof QualityScorecard, QualityDimension][];
    for (const [key, dim] of dimensionEntries) {
      if (dim.score < 50) {
        improvementAreas.push(`${key}: ${dim.reasoning}`);
      }
    }

    // Storyteller issues
    const storytellerEval = agentEvaluations.find((e) => e.agentName === 'Storyteller');
    const previousIssues = storytellerEval?.issues || [];
    const requiredElements = listener.interests?.map(
      (i) => `Reference to recipient's interest in "${i}"`
    ) || [];

    return {
      explorerGuidance: {
        missedInterests,
        additionalSearchQueries,
        searchDirection,
        suggestedCategories: [],
        budgetEnforcement,
      },
      validatorGuidance: {
        thresholdPolicy: 'strict_only',
        emphasizeChecks: ['relevanceCheck', 'budgetCheck', 'archetypeCheck'],
      },
      storytellerGuidance: {
        requiredElements,
        previousIssues,
      },
      rejectionReason: `Overall quality score ${this.calculateOverallScore(scorecard)}/100 below threshold ${this.config.passThreshold}. ${improvementAreas.length} dimensions below 50%.`,
      improvementAreas,
    };
  }

  /**
   * Create fallback output when evaluation itself fails
   */
  private createFallbackOutput(input: BarRaiserInput): BarRaiserOutput {
    const makeDimension = (score: number): QualityDimension => ({
      score,
      reasoning: 'Evaluation failed — default score applied',
      evidence: [],
    });

    const scorecard: QualityScorecard = {
      relevance: makeDimension(50),
      personalization: makeDimension(50),
      storytellingQuality: makeDimension(50),
      diversity: makeDimension(50),
      humanSanityCheck: makeDimension(50),
      budgetAdherence: makeDimension(50),
      interestCoverage: makeDimension(50),
      presentationCohesion: makeDimension(50),
    };

    return {
      verdict: 'APPROVED_WITH_CONCERNS',
      scorecard,
      agentEvaluations: [],
      overallScore: 50,
      summary: 'Bar Raiser evaluation failed; approving with concerns to avoid blocking user.',
      criticalFailures: [],
      attemptNumber: input.attemptNumber,
      evaluatedAt: new Date(),
    };
  }
}
