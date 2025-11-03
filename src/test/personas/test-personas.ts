/**
 * 10 Diverse Test Personas
 *
 * Realistic gift-giver profiles covering wide range of demographics,
 * occasions, relationships, and gift-giving styles.
 */

import { TestPersona } from '../../types/persona';

export const TEST_PERSONAS: TestPersona[] = [
  // PERSONA 1: The Thoughtful Planner
  {
    id: 'persona-001-sarah',
    name: 'Sarah Chen',
    demographics: {
      age: 32,
      gender: 'female',
      location: 'San Francisco, CA',
      occupation: 'Product Manager',
      incomeLevel: 'comfortable',
      lifestage: 'young-professional',
      techSavviness: 'high',
    },
    giftGivingStyle: {
      planningStyle: 'planned',
      budgetApproach: 'value-focused',
      typicalBudgetRange: { min: 50, max: 150 },
      decisionStyle: 'analytical',
      preferredGiftTypes: ['experiential', 'sentimental', 'unique'],
      riskTolerance: 'moderate',
      personalizationImportance: 'critical',
    },
    psychographics: {
      values: ['thoughtfulness', 'sustainability', 'quality', 'uniqueness'],
      personality: ['analytical', 'empathetic', 'detail-oriented'],
      stressors: ['fear-of-disappointment', 'wanting-perfect-gift'],
      motivations: ['show-love', 'surprise-delight', 'meaningful-connection'],
    },
    scenarios: [
      {
        id: 'sarah-scenario-1',
        occasion: {
          type: 'birthday',
          significance: 'milestone',
          daysUntil: 14,
          pastGiftHistory: [
            {
              occasion: 'birthday',
              gift: 'Hand-thrown pottery mug',
              reaction: 'loved',
              whatWorked: 'Handmade, unique, practical',
              whatDidntWork: null,
            },
          ],
        },
        recipient: {
          name: 'Mom',
          relationship: 'mom',
          intimacyLevel: 'very-close',
          age: 58,
          gender: 'female',
          interests: ['gardening', 'cooking', 'reading', 'yoga'],
          values: ['sustainability', 'wellness', 'family'],
          lifestyle: ['active', 'health-conscious', 'nature-lover'],
          recentLifeEvents: ['retired'],
          knownDislikes: ['technology gadgets', 'clutter'],
          knowledgeLevel: 'know-very-well',
        },
        context: {
          timePressure: 'low',
          budgetFlexibility: 'somewhat-flexible',
          uncertaintyLevel: 'mostly-confident',
          additionalConstraints: ['eco-friendly-preferred', 'not-too-trendy'],
          emotionalState: 'excited',
          priorAttempts: 0,
        },
        expectedQueryStyle: {
          verbosity: 'detailed',
          specificityLevel: 'very-specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: true,
          includesConstraints: true,
          naturalness: 'conversational',
          clarityLevel: 'very-clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['matches-interests', 'high-quality', 'unique', 'within-budget'],
      dealBreakers: ['too-generic', 'low-quality', 'not-sustainable'],
      minRelevanceScore: 8,
      minPersonalizationScore: 8,
      minConfidenceScore: 0.7,
      maxAcceptableResponseTime: 30,
      needsExplanations: true,
      prefersVariety: true,
      wantsAlternatives: true,
    },
  },

  // PERSONA 2: The Last-Minute Gifter
  {
    id: 'persona-002-mike',
    name: 'Mike Johnson',
    demographics: {
      age: 28,
      gender: 'male',
      location: 'Austin, TX',
      occupation: 'Software Engineer',
      incomeLevel: 'comfortable',
      lifestage: 'young-professional',
      techSavviness: 'expert',
    },
    giftGivingStyle: {
      planningStyle: 'last-minute',
      budgetApproach: 'flexible',
      typicalBudgetRange: { min: 30, max: 100 },
      decisionStyle: 'quick-decisive',
      preferredGiftTypes: ['practical', 'tech', 'experiential'],
      riskTolerance: 'adventurous',
      personalizationImportance: 'moderate',
    },
    psychographics: {
      values: ['convenience', 'cool-factor', 'practicality'],
      personality: ['spontaneous', 'optimistic', 'busy'],
      stressors: ['time-pressure', 'decision-paralysis'],
      motivations: ['show-appreciation', 'maintain-relationships'],
    },
    scenarios: [
      {
        id: 'mike-scenario-1',
        occasion: {
          type: 'christmas',
          significance: 'regular',
          daysUntil: 3,
        },
        recipient: {
          name: 'Dad',
          relationship: 'dad',
          intimacyLevel: 'close',
          age: 55,
          gender: 'male',
          interests: ['coffee', 'grilling', 'sports', 'woodworking'],
          knowledgeLevel: 'know-well',
        },
        context: {
          timePressure: 'urgent',
          budgetFlexibility: 'flexible',
          uncertaintyLevel: 'somewhat-uncertain',
          additionalConstraints: ['needs-fast-shipping'],
          emotionalState: 'stressed',
          priorAttempts: 2,
        },
        expectedQueryStyle: {
          verbosity: 'brief',
          specificityLevel: 'somewhat-specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: false,
          includesConstraints: false,
          naturalness: 'casual',
          clarityLevel: 'somewhat-clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['quick-decision', 'fast-shipping', 'safe-choice'],
      dealBreakers: ['too-complicated', 'out-of-stock', 'long-delivery'],
      minRelevanceScore: 6,
      minPersonalizationScore: 5,
      minConfidenceScore: 0.5,
      maxAcceptableResponseTime: 15,
      needsExplanations: false,
      prefersVariety: false,
      wantsAlternatives: true,
    },
  },

  // PERSONA 3: The Budget-Conscious Student
  {
    id: 'persona-003-jessica',
    name: 'Jessica Martinez',
    demographics: {
      age: 21,
      gender: 'female',
      location: 'Boston, MA',
      occupation: 'College Student',
      incomeLevel: 'low',
      lifestage: 'student',
      techSavviness: 'high',
    },
    giftGivingStyle: {
      planningStyle: 'week-before',
      budgetApproach: 'strict',
      typicalBudgetRange: { min: 15, max: 40 },
      decisionStyle: 'thoughtful',
      preferredGiftTypes: ['sentimental', 'creative', 'handmade'],
      riskTolerance: 'conservative',
      personalizationImportance: 'high',
    },
    psychographics: {
      values: ['thoughtfulness', 'creativity', 'value-for-money'],
      personality: ['creative', 'empathetic', 'budget-conscious'],
      stressors: ['budget-constraints', 'wanting-to-impress'],
      motivations: ['show-love', 'maintain-friendships', 'be-thoughtful'],
    },
    scenarios: [
      {
        id: 'jessica-scenario-1',
        occasion: {
          type: 'birthday',
          significance: 'major',
          daysUntil: 7,
        },
        recipient: {
          name: 'Best Friend',
          relationship: 'best-friend',
          relationshipDuration: '5-10years',
          intimacyLevel: 'very-close',
          age: 21,
          gender: 'female',
          interests: ['art', 'photography', 'vintage-fashion', 'plants'],
          values: ['creativity', 'authenticity', 'self-expression'],
          knowledgeLevel: 'know-very-well',
        },
        context: {
          timePressure: 'moderate',
          budgetFlexibility: 'fixed',
          uncertaintyLevel: 'confident',
          emotionalState: 'excited',
          priorAttempts: 1,
        },
        expectedQueryStyle: {
          verbosity: 'moderate',
          specificityLevel: 'specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: true,
          includesConstraints: true,
          naturalness: 'conversational',
          clarityLevel: 'clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['within-strict-budget', 'meaningful', 'unique'],
      dealBreakers: ['too-expensive', 'too-generic', 'impersonal'],
      minRelevanceScore: 7,
      minPersonalizationScore: 8,
      minConfidenceScore: 0.6,
      maxAcceptableResponseTime: 25,
      needsExplanations: true,
      prefersVariety: true,
      wantsAlternatives: true,
    },
  },

  // PERSONA 4: The Generous Executive
  {
    id: 'persona-004-david',
    name: 'David Kim',
    demographics: {
      age: 45,
      gender: 'male',
      location: 'New York, NY',
      occupation: 'VP of Sales',
      incomeLevel: 'very-high',
      lifestage: 'established',
      techSavviness: 'moderate',
    },
    giftGivingStyle: {
      planningStyle: 'early-planner',
      budgetApproach: 'generous',
      typicalBudgetRange: { min: 200, max: 500 },
      decisionStyle: 'quick-decisive',
      preferredGiftTypes: ['luxurious', 'experiential', 'impressive'],
      riskTolerance: 'adventurous',
      personalizationImportance: 'high',
    },
    psychographics: {
      values: ['quality', 'exclusivity', 'thoughtfulness', 'status'],
      personality: ['confident', 'decisive', 'generous'],
      stressors: ['limited-time', 'wanting-to-impress'],
      motivations: ['show-appreciation', 'impress', 'celebrate-success'],
    },
    scenarios: [
      {
        id: 'david-scenario-1',
        occasion: {
          type: 'anniversary',
          significance: 'milestone',
          daysUntil: 21,
        },
        recipient: {
          name: 'Wife',
          relationship: 'spouse',
          relationshipDuration: '10+years',
          intimacyLevel: 'intimate',
          age: 42,
          gender: 'female',
          interests: ['wine', 'travel', 'fine-dining', 'spa', 'jewelry'],
          values: ['luxury', 'quality', 'experiences'],
          lifestyle: ['sophisticated', 'active-social-life'],
          knowledgeLevel: 'know-very-well',
        },
        context: {
          timePressure: 'none',
          budgetFlexibility: 'no-limit',
          uncertaintyLevel: 'confident',
          emotionalState: 'excited',
          priorAttempts: 0,
        },
        expectedQueryStyle: {
          verbosity: 'moderate',
          specificityLevel: 'specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: true,
          includesConstraints: false,
          naturalness: 'formal',
          clarityLevel: 'very-clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['high-quality', 'impressive', 'unique', 'luxurious'],
      dealBreakers: ['cheap-looking', 'too-common', 'low-quality'],
      minRelevanceScore: 8,
      minPersonalizationScore: 7,
      minConfidenceScore: 0.7,
      maxAcceptableResponseTime: 30,
      needsExplanations: true,
      prefersVariety: true,
      wantsAlternatives: false,
    },
  },

  // PERSONA 5: The Anxious New Relationship
  {
    id: 'persona-005-emily',
    name: 'Emily Foster',
    demographics: {
      age: 26,
      gender: 'female',
      location: 'Seattle, WA',
      occupation: 'Graphic Designer',
      incomeLevel: 'moderate',
      lifestage: 'young-professional',
      techSavviness: 'high',
    },
    giftGivingStyle: {
      planningStyle: 'planned',
      budgetApproach: 'value-focused',
      typicalBudgetRange: { min: 40, max: 80 },
      decisionStyle: 'second-guesser',
      preferredGiftTypes: ['thoughtful', 'safe', 'creative'],
      riskTolerance: 'conservative',
      personalizationImportance: 'critical',
    },
    psychographics: {
      values: ['thoughtfulness', 'appropriateness', 'creativity'],
      personality: ['thoughtful', 'anxious', 'detail-oriented'],
      stressors: ['fear-of-disappointment', 'wanting-to-impress', 'overthinking'],
      motivations: ['build-connection', 'show-interest', 'avoid-mistakes'],
    },
    scenarios: [
      {
        id: 'emily-scenario-1',
        occasion: {
          type: 'birthday',
          significance: 'major',
          daysUntil: 10,
        },
        recipient: {
          name: 'Boyfriend',
          relationship: 'romantic-partner',
          relationshipDuration: '1-2years',
          intimacyLevel: 'close',
          age: 28,
          gender: 'male',
          interests: ['gaming', 'hiking', 'craft-beer', 'cooking'],
          knowledgeLevel: 'know-well',
        },
        context: {
          timePressure: 'moderate',
          budgetFlexibility: 'somewhat-flexible',
          uncertaintyLevel: 'very-uncertain',
          additionalConstraints: ['not-too-serious', 'not-too-casual'],
          emotionalState: 'worried',
          priorAttempts: 3,
        },
        expectedQueryStyle: {
          verbosity: 'very-detailed',
          specificityLevel: 'very-specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: true,
          includesConstraints: true,
          naturalness: 'conversational',
          clarityLevel: 'clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['appropriate-intimacy', 'thoughtful', 'safe-choice', 'within-budget'],
      dealBreakers: ['too-serious', 'too-casual', 'risky', 'might-offend'],
      minRelevanceScore: 7,
      minPersonalizationScore: 8,
      minConfidenceScore: 0.7,
      maxAcceptableResponseTime: 30,
      needsExplanations: true,
      prefersVariety: true,
      wantsAlternatives: true,
    },
  },

  // PERSONA 6: The Practical Parent
  {
    id: 'persona-006-linda',
    name: 'Linda Thompson',
    demographics: {
      age: 38,
      gender: 'female',
      location: 'Denver, CO',
      occupation: 'Elementary School Teacher',
      incomeLevel: 'moderate',
      lifestage: 'family',
      techSavviness: 'moderate',
    },
    giftGivingStyle: {
      planningStyle: 'week-before',
      budgetApproach: 'value-focused',
      typicalBudgetRange: { min: 25, max: 60 },
      decisionStyle: 'thoughtful',
      preferredGiftTypes: ['practical', 'educational', 'wholesome'],
      riskTolerance: 'conservative',
      personalizationImportance: 'moderate',
    },
    psychographics: {
      values: ['practicality', 'value', 'quality', 'family'],
      personality: ['practical', 'warm', 'organized'],
      stressors: ['budget-constraints', 'time-pressure', 'multiple-gifts'],
      motivations: ['show-love', 'teach-values', 'maintain-tradition'],
    },
    scenarios: [
      {
        id: 'linda-scenario-1',
        occasion: {
          type: 'christmas',
          significance: 'major',
          daysUntil: 30,
        },
        recipient: {
          name: 'Sister',
          relationship: 'sibling',
          intimacyLevel: 'close',
          age: 35,
          gender: 'female',
          interests: ['reading', 'baking', 'home-decor', 'crafts'],
          lifestyle: ['homebody', 'family-oriented'],
          recentLifeEvents: ['new-baby'],
          knowledgeLevel: 'know-very-well',
        },
        context: {
          timePressure: 'low',
          budgetFlexibility: 'fixed',
          uncertaintyLevel: 'confident',
          additionalConstraints: ['practical', 'useful', 'family-friendly'],
          emotionalState: 'neutral',
          priorAttempts: 0,
        },
        expectedQueryStyle: {
          verbosity: 'moderate',
          specificityLevel: 'specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: true,
          includesConstraints: true,
          naturalness: 'conversational',
          clarityLevel: 'clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['practical', 'good-value', 'within-budget', 'useful'],
      dealBreakers: ['frivolous', 'too-expensive', 'impractical'],
      minRelevanceScore: 7,
      minPersonalizationScore: 6,
      minConfidenceScore: 0.6,
      maxAcceptableResponseTime: 25,
      needsExplanations: false,
      prefersVariety: true,
      wantsAlternatives: false,
    },
  },

  // PERSONA 7: The Corporate Gift-Giver
  {
    id: 'persona-007-robert',
    name: 'Robert Chen',
    demographics: {
      age: 41,
      gender: 'male',
      location: 'Chicago, IL',
      occupation: 'Team Lead',
      incomeLevel: 'comfortable',
      lifestage: 'established',
      techSavviness: 'moderate',
    },
    giftGivingStyle: {
      planningStyle: 'planned',
      budgetApproach: 'strict',
      typicalBudgetRange: { min: 30, max: 50 },
      decisionStyle: 'analytical',
      preferredGiftTypes: ['professional', 'safe', 'universal'],
      riskTolerance: 'conservative',
      personalizationImportance: 'moderate',
    },
    psychographics: {
      values: ['appropriateness', 'professionalism', 'inclusivity'],
      personality: ['professional', 'considerate', 'cautious'],
      stressors: ['fear-of-inappropriate', 'wanting-to-be-fair'],
      motivations: ['show-appreciation', 'maintain-morale', 'be-professional'],
    },
    scenarios: [
      {
        id: 'robert-scenario-1',
        occasion: {
          type: 'thank-you',
          significance: 'regular',
          daysUntil: 5,
        },
        recipient: {
          name: 'Team Member',
          relationship: 'colleague',
          intimacyLevel: 'casual',
          age: 30,
          gender: 'female',
          interests: ['unknown'],
          knowledgeLevel: 'know-little',
        },
        context: {
          timePressure: 'moderate',
          budgetFlexibility: 'fixed',
          uncertaintyLevel: 'very-uncertain',
          additionalConstraints: ['professional', 'inclusive', 'not-personal'],
          emotionalState: 'neutral',
          priorAttempts: 0,
        },
        expectedQueryStyle: {
          verbosity: 'brief',
          specificityLevel: 'vague',
          includesBudget: true,
          includesInterests: false,
          includesContext: true,
          includesConstraints: true,
          naturalness: 'formal',
          clarityLevel: 'somewhat-clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['professional', 'appropriate', 'safe', 'within-budget'],
      dealBreakers: ['too-personal', 'controversial', 'inappropriate'],
      minRelevanceScore: 5,
      minPersonalizationScore: 3,
      minConfidenceScore: 0.5,
      maxAcceptableResponseTime: 20,
      needsExplanations: false,
      prefersVariety: false,
      wantsAlternatives: true,
    },
  },

  // PERSONA 8: The Trendy Gen-Z
  {
    id: 'persona-008-alex',
    name: 'Alex Rivera',
    demographics: {
      age: 23,
      gender: 'non-binary',
      location: 'Portland, OR',
      occupation: 'Content Creator',
      incomeLevel: 'moderate',
      lifestage: 'young-professional',
      techSavviness: 'expert',
    },
    giftGivingStyle: {
      planningStyle: 'last-minute',
      budgetApproach: 'flexible',
      typicalBudgetRange: { min: 35, max: 90 },
      decisionStyle: 'quick-decisive',
      preferredGiftTypes: ['trendy', 'unique', 'aesthetic', 'experience'],
      riskTolerance: 'adventurous',
      personalizationImportance: 'high',
    },
    psychographics: {
      values: ['authenticity', 'sustainability', 'social-consciousness', 'aesthetics'],
      personality: ['creative', 'trendy', 'socially-conscious'],
      stressors: ['wanting-unique', 'avoiding-mainstream'],
      motivations: ['express-creativity', 'surprise-delight', 'share-values'],
    },
    scenarios: [
      {
        id: 'alex-scenario-1',
        occasion: {
          type: 'just-because',
          significance: 'casual',
          daysUntil: 2,
        },
        recipient: {
          name: 'Close Friend',
          relationship: 'close-friend',
          relationshipDuration: '3-5years',
          intimacyLevel: 'very-close',
          age: 24,
          gender: 'female',
          interests: ['art', 'thrifting', 'plants', 'astrology', 'music'],
          values: ['sustainability', 'authenticity', 'creativity'],
          lifestyle: ['creative', 'alternative', 'socially-conscious'],
          knowledgeLevel: 'know-very-well',
        },
        context: {
          timePressure: 'high',
          budgetFlexibility: 'somewhat-flexible',
          uncertaintyLevel: 'confident',
          additionalConstraints: ['sustainable', 'unique', 'aesthetic'],
          emotionalState: 'excited',
          priorAttempts: 0,
        },
        expectedQueryStyle: {
          verbosity: 'moderate',
          specificityLevel: 'specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: false,
          includesConstraints: true,
          naturalness: 'colloquial',
          clarityLevel: 'clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['unique', 'aesthetic', 'sustainable', 'on-brand'],
      dealBreakers: ['basic', 'mass-produced', 'harmful', 'boring'],
      minRelevanceScore: 8,
      minPersonalizationScore: 8,
      minConfidenceScore: 0.6,
      maxAcceptableResponseTime: 20,
      needsExplanations: true,
      prefersVariety: true,
      wantsAlternatives: true,
    },
  },

  // PERSONA 9: The Empty-Nester
  {
    id: 'persona-009-barbara',
    name: 'Barbara Williams',
    demographics: {
      age: 62,
      gender: 'female',
      location: 'Phoenix, AZ',
      occupation: 'Retired HR Manager',
      incomeLevel: 'comfortable',
      lifestage: 'empty-nester',
      techSavviness: 'low',
    },
    giftGivingStyle: {
      planningStyle: 'early-planner',
      budgetApproach: 'generous',
      typicalBudgetRange: { min: 75, max: 200 },
      decisionStyle: 'thoughtful',
      preferredGiftTypes: ['sentimental', 'practical', 'quality'],
      riskTolerance: 'moderate',
      personalizationImportance: 'high',
    },
    psychographics: {
      values: ['family', 'tradition', 'quality', 'thoughtfulness'],
      personality: ['warm', 'traditional', 'generous'],
      stressors: ['technology-challenges', 'wanting-meaningful-gifts'],
      motivations: ['show-love', 'maintain-tradition', 'create-memories'],
    },
    scenarios: [
      {
        id: 'barbara-scenario-1',
        occasion: {
          type: 'graduation',
          significance: 'milestone',
          daysUntil: 45,
        },
        recipient: {
          name: 'Grandson',
          relationship: 'grandchild',
          intimacyLevel: 'very-close',
          age: 22,
          gender: 'male',
          interests: ['tech', 'gaming', 'fitness', 'travel'],
          recentLifeEvents: ['college-graduation', 'starting-career'],
          knowledgeLevel: 'know-well',
        },
        context: {
          timePressure: 'none',
          budgetFlexibility: 'flexible',
          uncertaintyLevel: 'somewhat-uncertain',
          additionalConstraints: ['meaningful', 'useful-for-career'],
          emotionalState: 'excited',
          priorAttempts: 0,
        },
        expectedQueryStyle: {
          verbosity: 'detailed',
          specificityLevel: 'somewhat-specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: true,
          includesConstraints: false,
          naturalness: 'formal',
          clarityLevel: 'clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['meaningful', 'quality', 'appropriate-for-milestone'],
      dealBreakers: ['too-trendy', 'cheap-looking', 'impersonal'],
      minRelevanceScore: 7,
      minPersonalizationScore: 7,
      minConfidenceScore: 0.6,
      maxAcceptableResponseTime: 40,
      needsExplanations: true,
      prefersVariety: true,
      wantsAlternatives: false,
    },
  },

  // PERSONA 10: The International Gifter
  {
    id: 'persona-010-raj',
    name: 'Raj Patel',
    demographics: {
      age: 35,
      gender: 'male',
      location: 'London, UK',
      occupation: 'Data Scientist',
      incomeLevel: 'comfortable',
      lifestage: 'established',
      techSavviness: 'expert',
    },
    giftGivingStyle: {
      planningStyle: 'planned',
      budgetApproach: 'value-focused',
      typicalBudgetRange: { min: 60, max: 120 },
      decisionStyle: 'analytical',
      preferredGiftTypes: ['unique', 'cultural', 'meaningful', 'practical'],
      riskTolerance: 'moderate',
      personalizationImportance: 'high',
    },
    psychographics: {
      values: ['cultural-sensitivity', 'thoughtfulness', 'quality', 'uniqueness'],
      personality: ['analytical', 'thoughtful', 'culturally-aware'],
      stressors: ['distance', 'cultural-appropriateness', 'shipping-complexity'],
      motivations: ['maintain-connections', 'show-appreciation', 'share-culture'],
    },
    scenarios: [
      {
        id: 'raj-scenario-1',
        occasion: {
          type: 'wedding',
          significance: 'milestone',
          daysUntil: 60,
        },
        recipient: {
          name: 'College Friend',
          relationship: 'close-friend',
          relationshipDuration: '10+years',
          intimacyLevel: 'close',
          age: 34,
          gender: 'female',
          interests: ['travel', 'cooking', 'photography', 'music'],
          lifestyle: ['adventurous', 'foodie', 'creative'],
          knowledgeLevel: 'know-well',
        },
        context: {
          timePressure: 'low',
          budgetFlexibility: 'somewhat-flexible',
          uncertaintyLevel: 'confident',
          additionalConstraints: ['ships-internationally', 'culturally-appropriate'],
          emotionalState: 'excited',
          priorAttempts: 0,
        },
        expectedQueryStyle: {
          verbosity: 'detailed',
          specificityLevel: 'specific',
          includesBudget: true,
          includesInterests: true,
          includesContext: true,
          includesConstraints: true,
          naturalness: 'formal',
          clarityLevel: 'very-clear',
        },
      },
    ],
    expectations: {
      mustHaves: ['meaningful', 'unique', 'appropriate-for-occasion', 'ships-international'],
      dealBreakers: ['culturally-insensitive', 'too-generic', 'shipping-issues'],
      minRelevanceScore: 8,
      minPersonalizationScore: 8,
      minConfidenceScore: 0.7,
      maxAcceptableResponseTime: 35,
      needsExplanations: true,
      prefersVariety: true,
      wantsAlternatives: true,
    },
  },
];

// Helper functions
export function getPersonaById(id: string): TestPersona | undefined {
  return TEST_PERSONAS.find((p) => p.id === id);
}

export function getPersonasByDemographic(
  key: keyof TestPersona['demographics'],
  value: any
): TestPersona[] {
  return TEST_PERSONAS.filter((p) => p.demographics[key] === value);
}

export function getPersonasByGiftStyle(
  key: keyof TestPersona['giftGivingStyle'],
  value: any
): TestPersona[] {
  return TEST_PERSONAS.filter((p) => p.giftGivingStyle[key] === value);
}

export function getAllPersonaIds(): string[] {
  return TEST_PERSONAS.map((p) => p.id);
}

export function getPersonaSummary(): string {
  return `
10 Test Personas Coverage:

Demographics:
- Age range: 21-62 years
- Income levels: low (1), moderate (4), comfortable (4), very-high (1)
- Life stages: student (1), young-professional (4), established (3), family (1), empty-nester (1)
- Tech savviness: low (1), moderate (4), high (3), expert (2)

Gift-Giving Styles:
- Planning: last-minute (2), week-before (2), planned (4), early-planner (2)
- Budget: strict (2), flexible (3), generous (2), value-focused (2), luxury-seeker (1)
- Decision: quick-decisive (3), thoughtful (4), analytical (2), second-guesser (1)

Occasions:
- Birthday (5), Christmas (2), Anniversary (1), Graduation (1), Wedding (1), Thank-you (1), Just-because (1)

Relationships:
- Family: mom (1), dad (1), sibling (1), grandchild (1)
- Romantic: spouse (1), romantic-partner (1)
- Friends: best-friend (1), close-friend (3)
- Professional: colleague (1)

Budget Ranges:
- Low ($15-40): 1 persona
- Moderate ($25-100): 6 personas
- High ($120-200): 2 personas
- Very High ($200-500): 1 persona
`;
}
