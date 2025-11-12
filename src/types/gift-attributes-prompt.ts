/**
 * LLM Prompt Generator for Comprehensive Gift Attribute Inference
 *
 * Generates prompts for GPT-4o-mini to analyze products and infer
 * all 100 gift attributes organized into 11 dimension groups.
 */

export function generateComprehensiveAttributePrompt(product: {
  title: string;
  description: string;
  price?: number;
  vendor?: string;
  interests?: string[];
}): string {
  return `You are an expert gift consultant analyzing products to determine their comprehensive gift-giving attributes. Analyze the TYPE and NATURE of gift this product represents across multiple dimensions.

PRODUCT INFORMATION:
Title: ${product.title}
Description: ${product.description || 'N/A'}
Price: ${product.price ? `$${product.price}` : 'N/A'}
Vendor: ${product.vendor || 'N/A'}
Related Interests: ${product.interests && product.interests.length > 0 ? product.interests.join(', ') : 'N/A'}

COMPREHENSIVE ATTRIBUTE DEFINITIONS (100 attributes in 11 groups):

═══════════════════════════════════════════════════════════════
GROUP 1: EXPERIENCE & TIME (8 attributes)
═══════════════════════════════════════════════════════════════
• isExperiential: Activity-based gifts (classes, events, tickets, subscriptions, experiences)
• isMemoryMaking: Creates lasting memories (photo albums, travel, keepsakes, experience gifts)
• isConsumable: Used up over time (food, wine, beauty products, candles, consumables)
• isLastingValue: Durable, investment-quality, will last for years
• isOneTimeUse: Single-use or disposable item, not meant to last
• isSubscriptionBased: Recurring delivery or ongoing access (subscription boxes, memberships)
• isImmediateGratification: Immediate enjoyment, no setup or learning curve required
• isLongTermInvestment: Appreciates in value or provides benefits over many years

═══════════════════════════════════════════════════════════════
GROUP 2: SENTIMENT & EMOTIONAL CONNECTION (10 attributes)
═══════════════════════════════════════════════════════════════
• isSentimental: Emotionally meaningful, heartfelt, carries symbolic significance
• isPersonalized: Custom-made, monogrammed, bespoke, tailored to individual
• isRomantic: Specifically for romantic partners, love-focused, intimate
• isNostalgic: Evokes past memories, vintage feel, retro, brings back fond memories
• isVintage: Antique or retro styling, classic aesthetic (not just old sentiment)
• isCelebratory: For celebrations, milestones, festivities, marking special occasions
• isComforting: Provides emotional comfort, reassurance, warmth, security
• isSurprising: Unexpected, element of surprise, delightful discovery
• isHeartfelt: Sincere, genuine, from-the-heart, deeply personal
• isSymbolic: Represents deeper meaning, metaphorical significance, tells a story

═══════════════════════════════════════════════════════════════
GROUP 3: FUNCTION & UTILITY (12 attributes)
═══════════════════════════════════════════════════════════════
• isPractical: Solves problems, everyday utility, functional, useful in daily life
• isLuxury: High-end, premium, indulgent, expensive, exclusive, upscale
• isWellness: Health-focused, self-care, fitness, mindfulness, well-being
• isTechEnabled: Smart, connected, digital, electronic, technologically advanced
• isPortable: Easy to carry, travel-friendly, mobile, lightweight and mobile
• isReadyToUse: No assembly, setup, or learning curve required, instant usability
• isMultiFunctional: Serves multiple purposes, versatile, adaptable
• isSpaceSaving: Compact design, doesn't take much room, storage-efficient
• isEasyToMaintain: Low maintenance, easy to clean or care for, hassle-free
• isWeatherResistant: Can be used outdoors, weather-proof, all-season
• isUpgradable: Can be enhanced or expanded over time, modular
• isRepairable: Can be fixed if broken, serviceable, not disposable

═══════════════════════════════════════════════════════════════
GROUP 4: SOCIAL & RELATIONSHIP (10 attributes)
═══════════════════════════════════════════════════════════════
• isShared: Enjoyed with others, group experiences, social, multiplayer
• isConversationStarter: Unique, interesting, story-worthy, distinctive, remarkable
• isFamilyFriendly: Suitable for all ages, kid-safe, appropriate for children
• isPartyFocused: For celebrations, parties, gatherings, entertaining guests
• isIntimateGathering: For 2-6 people, small groups, couples, close friends
• isHostingRelated: For entertaining guests, hospitality, hosting duties
• isCrowdPleaser: Appeals to wide audience, universally liked, broadly appealing
• isGenderNeutral: Appropriate for any gender, not gender-specific
• isGenerationallyNeutral: Appeals across age groups, not age-restricted
• isCulturallyNeutral: Works across different cultures, universal appeal

═══════════════════════════════════════════════════════════════
GROUP 5: AESTHETIC & DESIGN (12 attributes)
═══════════════════════════════════════════════════════════════
• isArtistic: Art, design objects, creative, aesthetically focused, gallery-worthy
• isMinimalist: Simple, clean, uncluttered, understated, less-is-more aesthetic
• isColorful: Bright, vibrant, eye-catching colors, multi-colored, vivid
• isElegant: Refined, sophisticated, classy, graceful, tasteful
• isBold: Strong visual statement, dramatic, striking, makes an impact
• isSubtle: Understated, muted, gentle, low-key, quiet beauty
• isVintageStyle: Classic vintage aesthetic (may be new but vintage-inspired)
• isModern: Contemporary, current design trends, cutting-edge style
• isTraditional: Classic, timeless, conventional styling, heritage design
• isQuirky: Fun, unconventional, playful design, offbeat, whimsical styling
• isVisuallyStriking: Visually impressive, attention-grabbing, show-stopping
• isIconic: Recognizable, legendary design, famous, culturally significant

═══════════════════════════════════════════════════════════════
GROUP 6: LEARNING & GROWTH (8 attributes)
═══════════════════════════════════════════════════════════════
• isAspirational: Helps achieve goals, self-improvement, personal growth
• isEducational: Teaches skills, expands knowledge, learning-focused
• isSkillBuilding: Develops specific abilities, practice-based, mastery-oriented
• isInspirational: Motivational, encouraging, uplifting, empowering
• isTransformative: Life-changing potential, profound impact, paradigm-shifting
• isCreative: Encourages artistic expression, imagination, creative thinking
• isProductivityEnhancing: Helps with work, organization, efficiency, optimization
• isMindExpanding: Broadens perspective, intellectual stimulation, thought-provoking

═══════════════════════════════════════════════════════════════
GROUP 7: SUSTAINABILITY & ETHICS (7 attributes)
═══════════════════════════════════════════════════════════════
• isEcoFriendly: Environmentally conscious, sustainable, green, low environmental impact
• isHandcrafted: Artisan-made, hand-crafted, one-of-a-kind, human-made with care
• isLocal: Local artisan, small business, community-supporting, locally sourced
• isEthicallySourced: Fair trade, ethically sourced, socially responsible
• isFairTrade: Fair trade certified, supports fair wages, ethical production
• isZeroWaste: Minimal waste, recyclable, sustainable packaging, eco-packaging
• isRecycled: Made from recycled or upcycled materials, repurposed

═══════════════════════════════════════════════════════════════
GROUP 8: PHYSICAL & SENSORY (13 attributes)
═══════════════════════════════════════════════════════════════
• isFragrant: Has pleasant scent, aromatic, perfumed, smells good
• isTactile: Interesting texture, touchable, tactile appeal, feel-good
• isEdible: Food or beverage item, can be eaten or drunk
• isAuditory: Makes sound, musical, auditory component, sound-producing
• isVisual: Strong visual component, display-worthy, visually engaging
• isCompact: Small, portable, doesn't take much space, miniature
• isBulky: Large, requires space, substantial size, takes up room
• isLightweight: Easy to move, not heavy, easy to carry
• isDelicate: Fragile, requires careful handling, breakable
• isDurable: Sturdy, robust, hard to break, resilient
• isTextured: Has interesting surface texture, tactile surface
• isSmooth: Smooth surface, sleek finish, polished
• isWarm: Cozy, warm feeling or temperature, comforting warmth

═══════════════════════════════════════════════════════════════
GROUP 9: USAGE CONTEXT (10 attributes)
═══════════════════════════════════════════════════════════════
• isIndoor: For indoor use, home-based, interior use
• isOutdoor: For outdoor use, nature-oriented, exterior use
• isTravel: Travel-friendly, vacation-related, on-the-go
• isHome: For home use, domestic setting, household
• isOffice: For workplace, professional setting, work environment
• isActive: Requires physical activity, movement, energy expenditure
• isPassive: Relaxing, low-energy, restful, no physical exertion
• isBeginner: Suitable for novices, no experience needed, entry-level
• isExpert: For experienced users, advanced, requires skill
• isAllAges: Appropriate for any age group, age-inclusive

═══════════════════════════════════════════════════════════════
GROUP 10: VALUE & UNIQUENESS (9 attributes)
═══════════════════════════════════════════════════════════════
• isBudgetFriendly: Affordable, good value, typically under $50
• isSplurgeWorthy: Premium price point, luxury purchase, high-end pricing
• isLimitedEdition: Limited production, rare, exclusive, scarce
• isUnique: One-of-a-kind, hard to find, special, distinctive
• isCollectible: Investment piece, appreciates over time, collectible value
• isTimeless: Classic appeal, won't go out of style, enduring design
• isTrendy: Currently popular, on-trend, fashionable, zeitgeist
• isMainstream: Widely available, common, popular, mass-market
• isNiche: Hard to find, exclusive, specialized, caters to specific interests

═══════════════════════════════════════════════════════════════
GROUP 11: EMOTIONAL TONE (6 attributes)
═══════════════════════════════════════════════════════════════
• isWhimsical: Playful, funny, lighthearted, amusing, delightful
• isSerious: Formal, sophisticated, professional, dignified
• isPlayful: Fun, entertaining, joyful, game-like
• isRespectful: Dignified, appropriate for formal occasions, reverent
• isEnergetic: Exciting, invigorating, high-energy, dynamic
• isCalming: Relaxing, peaceful, soothing, tranquil, stress-relieving

═══════════════════════════════════════════════════════════════

ANALYSIS GUIDELINES:
• Infer attributes based on the product's NATURE, not just explicit keywords
• A product can have MANY attributes across multiple groups (10-20 is common)
• Consider the GIFT-GIVING CONTEXT: What type of gift experience does this create?
• Think about WHY someone would give this as a gift and HOW it would be received
• Only mark attributes as TRUE if they genuinely and clearly apply
• Consider BOTH obvious and subtle attributes (e.g., a book can be isEducational, isPortable, isPassive, isIndoor, AND isCalming)
• Price influences some attributes: under $50 → isBudgetFriendly, over $200 → isSplurgeWorthy/isLuxury

COMPREHENSIVE EXAMPLES (showing multi-dimensional analysis):

Example 1: "Handmade Leather Journal with Custom Embossing"
→ isPersonalized, isSentimental, isHandcrafted, isArtistic, isPractical, isLastingValue, isDurable, isPortable, isCreative, isProductivityEnhancing, isElegant, isTraditional, isIndoor, isPassive, isTactile, isSmooth, isRespectful, isTimeless

Example 2: "Cooking Class for Two - Italian Cuisine"
→ isExperiential, isEducational, isMemoryMaking, isShared, isActive, isSkillBuilding, isIntimateGathering, isCreative, isImmediateGratification, isCrowdPleaser, isGenderNeutral, isAllAges, isPlayful, isEnergetic, isSocial, isRomantic (if for couples)

Example 3: "Smart Watch with Fitness Tracking"
→ isTechEnabled, isPractical, isWellness, isPortable, isActive, isProductivityEnhancing, isUpgradable, isMultiFunctional, isModern, isEveryday, isDurable, isSplurgeWorthy (if expensive), isTrendy, isMainstream, isIndoor, isOutdoor, isTravel

Example 4: "Vintage Wine Collection (3 bottles, $250)"
→ isLuxury, isConsumable, isEdible, isSplurgeWorthy, isVintage, isElegant, isSophisticated, isShared, isConversationStarter, isCollectible, isCelebratory, isRespectful, isPassive, isFragrant, isIndoor, isHostingRelated, isIntimateGathering

Example 5: "Eco-Friendly Yoga Mat - Recycled Materials"
→ isWellness, isEcoFriendly, isRecycled, isPractical, isActive, isPortable, isDurable, isEasyToMaintain, isCalming, isIndoor, isOutdoor, isBeginner, isAllAges, isTactile, isMinimalist, isModern, isEthicallySourced, isBudgetFriendly (if under $50)

Example 6: "Personalized Photo Album - Family Memories"
→ isSentimental, isPersonalized, isMemoryMaking, isHeartfelt, isSymbolic, isLastingValue, isFamilyFriendly, isPassive, isIndoor, isVisual, isTraditional, isTimeless, isRespectful, isComforting, isIntimateGathering

Example 7: "Limited Edition Art Print by Famous Artist"
→ isArtistic, isVisuallyStriking, isUnique, isLimitedEdition, isCollectible, isConversationStarter, isInspirational, isLastingValue, isElegant, isSplurgeWorthy, isVisual, isIndoor, isPassive, isIconic, isCulturallySignificant, isNiche

Example 8: "Board Game - Strategy & Fun for Groups"
→ isShared, isPlayful, isFamilyFriendly, isPartyFocused, isConversationStarter, isEnergetic, isCrowdPleaser, isLastingValue, isIndoor, isPassive, isActive (mentally), isAllAges, isGenderNeutral, isEducational (strategy), isBudgetFriendly, isMainstream

═══════════════════════════════════════════════════════════════

IMPORTANT: Return ONLY valid JSON (no markdown, no explanations, no additional text) in this exact format with ALL 100 attributes:

{
  "isExperiential": false,
  "isMemoryMaking": false,
  "isConsumable": false,
  "isLastingValue": false,
  "isOneTimeUse": false,
  "isSubscriptionBased": false,
  "isImmediateGratification": false,
  "isLongTermInvestment": false,
  "isSentimental": false,
  "isPersonalized": false,
  "isRomantic": false,
  "isNostalgic": false,
  "isVintage": false,
  "isCelebratory": false,
  "isComforting": false,
  "isSurprising": false,
  "isHeartfelt": false,
  "isSymbolic": false,
  "isPractical": false,
  "isLuxury": false,
  "isWellness": false,
  "isTechEnabled": false,
  "isPortable": false,
  "isReadyToUse": false,
  "isMultiFunctional": false,
  "isSpaceSaving": false,
  "isEasyToMaintain": false,
  "isWeatherResistant": false,
  "isUpgradable": false,
  "isRepairable": false,
  "isShared": false,
  "isConversationStarter": false,
  "isFamilyFriendly": false,
  "isPartyFocused": false,
  "isIntimateGathering": false,
  "isHostingRelated": false,
  "isCrowdPleaser": false,
  "isGenderNeutral": false,
  "isGenerationallyNeutral": false,
  "isCulturallyNeutral": false,
  "isArtistic": false,
  "isMinimalist": false,
  "isColorful": false,
  "isElegant": false,
  "isBold": false,
  "isSubtle": false,
  "isVintageStyle": false,
  "isModern": false,
  "isTraditional": false,
  "isQuirky": false,
  "isVisuallyStriking": false,
  "isIconic": false,
  "isAspirational": false,
  "isEducational": false,
  "isSkillBuilding": false,
  "isInspirational": false,
  "isTransformative": false,
  "isCreative": false,
  "isProductivityEnhancing": false,
  "isMindExpanding": false,
  "isEcoFriendly": false,
  "isHandcrafted": false,
  "isLocal": false,
  "isEthicallySourced": false,
  "isFairTrade": false,
  "isZeroWaste": false,
  "isRecycled": false,
  "isFragrant": false,
  "isTactile": false,
  "isEdible": false,
  "isAuditory": false,
  "isVisual": false,
  "isCompact": false,
  "isBulky": false,
  "isLightweight": false,
  "isDelicate": false,
  "isDurable": false,
  "isTextured": false,
  "isSmooth": false,
  "isWarm": false,
  "isIndoor": false,
  "isOutdoor": false,
  "isTravel": false,
  "isHome": false,
  "isOffice": false,
  "isActive": false,
  "isPassive": false,
  "isBeginner": false,
  "isExpert": false,
  "isAllAges": false,
  "isBudgetFriendly": false,
  "isSplurgeWorthy": false,
  "isLimitedEdition": false,
  "isUnique": false,
  "isCollectible": false,
  "isTimeless": false,
  "isTrendy": false,
  "isMainstream": false,
  "isNiche": false,
  "isWhimsical": false,
  "isSerious": false,
  "isPlayful": false,
  "isRespectful": false,
  "isEnergetic": false,
  "isCalming": false
}`;
}
