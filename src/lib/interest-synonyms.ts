/**
 * Interest Synonyms and Category Library
 *
 * Part 1: Product Categories
 * - Defines product categories and inference rules for categorizing products
 * - Pattern-based category inference from product text
 * - Enables better diversity filtering in product recommendations
 *
 * Part 2: Interest Taxonomy (Phase 2.2 Enhancement)
 * - 150+ interest terms covering all common gift-giving interests
 * - Canonical parent interests with related terms/synonyms
 * - Functions to normalize, expand, and relate interests
 * - Fixes the 18-interest bottleneck identified in graph audit
 *
 * Key Features:
 * - 50+ comprehensive product categories
 * - 150+ interest terms with synonym mapping
 * - Pattern-based category inference from product text
 * - Multi-category support (products can belong to multiple categories)
 * - Interest normalization and expansion
 * - Case-insensitive matching
 *
 * Usage:
 *   // Categories
 *   import { inferCategories, CATEGORIES } from './interest-synonyms';
 *   const categories = inferCategories(productTitle, productDescription);
 *
 *   // Interests
 *   import { normalizeInterest, expandInterests, getRelatedInterests } from './interest-synonyms';
 *   const canonical = normalizeInterest('video games'); // => 'gaming'
 *   const expanded = expandInterests(['espresso', 'hiking']); // => ['coffee', 'hiking']
 *   const related = getRelatedInterests('coffee'); // => ['tea', 'cooking', 'foodie']
 */

/**
 * Complete list of product categories
 * Organized by major domains for easier maintenance
 */
export const CATEGORIES = [
  // Art & Creative
  'Art & Prints',
  'Photography',
  'Craft Supplies',
  'Stationery',
  'Music & Instruments',

  // Food & Drink
  'Coffee & Tea',
  'Wine & Spirits',
  'Food & Snacks',
  'Cooking & Baking',
  'Kitchen Gadgets',

  // Experiences & Services
  'Experiences',
  'Subscriptions',
  'Classes & Workshops',
  'Events & Tickets',

  // Personal Care & Wellness
  'Beauty & Skincare',
  'Wellness & Self-Care',
  'Fitness & Exercise',
  'Spa & Bath',

  // Home & Living
  'Home Decor',
  'Kitchen & Dining',
  'Bedding & Linens',
  'Candles & Fragrance',
  'Plants & Gardening',
  'Furniture',

  // Fashion & Accessories
  'Fashion & Clothing',
  'Jewelry',
  'Watches',
  'Bags & Wallets',
  'Scarves & Accessories',

  // Books & Media
  'Books',
  'Audiobooks & Podcasts',
  'Movies & TV',
  'Magazines',

  // Games & Entertainment
  'Games & Puzzles',
  'Board Games',
  'Video Games',
  'Toys',

  // Tech & Gadgets
  'Tech Gadgets',
  'Smart Home',
  'Electronics',
  'Phone & Tablet Accessories',

  // Outdoor & Adventure
  'Outdoor & Camping',
  'Sports Equipment',
  'Travel Accessories',
  'Hiking & Climbing',

  // Hobbies & Interests
  'Pets & Pet Supplies',
  'Automotive',
  'Collectibles',
  'Magic & Novelty',

  // Special Occasions
  'Personalized Gifts',
  'Baby & Nursery',
  'Wedding & Anniversary',
  'Office & Desk',
] as const;

export type Category = typeof CATEGORIES[number];

/**
 * Category inference rules
 * Maps categories to regex patterns for matching against product text
 * Patterns are case-insensitive and match whole words or common phrases
 */
export const CATEGORY_RULES: Record<string, RegExp[]> = {
  // Art & Creative
  'Art & Prints': [
    /\b(art|print|painting|poster|canvas|gallery|artwork|illustration|drawing|sketch|frame|wall\s*art)\b/i,
  ],
  'Photography': [
    /\b(photo|photograph|camera|lens|tripod|photography|photographer|film|digital|snapshot)\b/i,
  ],
  'Craft Supplies': [
    /\b(craft|crafting|knit|knitting|crochet|sewing|embroidery|needle|yarn|fabric|diy|maker|scrapbook)\b/i,
  ],
  'Stationery': [
    /\b(stationery|notebook|journal|pen|pencil|marker|planner|calendar|notepad|paper|card|writing)\b/i,
  ],
  'Music & Instruments': [
    /\b(music|instrument|guitar|piano|drum|violin|sound|audio|speaker|headphone|record|vinyl)\b/i,
  ],

  // Food & Drink
  'Coffee & Tea': [
    /\b(coffee|espresso|tea|brewing|barista|cafe|latte|cappuccino|french\s*press|pour\s*over|matcha|chai)\b/i,
  ],
  'Wine & Spirits': [
    /\b(wine|whiskey|whisky|bourbon|scotch|vodka|gin|tequila|rum|spirit|cocktail|bar|sommelier)\b/i,
  ],
  'Food & Snacks': [
    /\b(food|snack|chocolate|candy|sweet|gourmet|treat|cookie|cake|dessert|confection)\b/i,
  ],
  'Cooking & Baking': [
    /\b(cooking|baking|recipe|chef|culinary|bake|cook|oven|stove|cookbook)\b/i,
  ],
  'Kitchen Gadgets': [
    /\b(kitchen|utensil|knife|cutting\s*board|mixer|blender|grater|peeler|gadget|tool)\b/i,
  ],

  // Experiences & Services
  'Experiences': [
    /\b(experience|adventure|trip|tour|class|workshop|lesson|activity|event|voucher|getaway)\b/i,
  ],
  'Subscriptions': [
    /\b(subscription|monthly|box|club|membership|service|delivery)\b/i,
  ],
  'Classes & Workshops': [
    /\b(class|workshop|course|learn|lesson|training|tutorial|session|seminar)\b/i,
  ],
  'Events & Tickets': [
    /\b(ticket|concert|show|theater|theatre|performance|event|game|festival)\b/i,
  ],

  // Personal Care & Wellness
  'Beauty & Skincare': [
    /\b(beauty|skincare|skin|face|makeup|cosmetic|serum|moisturizer|cream|lotion|cleanser)\b/i,
  ],
  'Wellness & Self-Care': [
    /\b(wellness|self\s*care|meditation|mindfulness|relaxation|calm|peace|zen|healing|therapy)\b/i,
  ],
  'Fitness & Exercise': [
    /\b(fitness|exercise|workout|gym|training|yoga|pilates|running|athletic|sport)\b/i,
  ],
  'Spa & Bath': [
    /\b(spa|bath|bathing|soak|bubble|bomb|salt|essential\s*oil|aromatherapy|massage)\b/i,
  ],

  // Home & Living
  'Home Decor': [
    /\b(decor|decoration|decorative|ornament|accent|display|centerpiece|vase|sculpture)\b/i,
  ],
  'Kitchen & Dining': [
    /\b(dining|tableware|dish|plate|bowl|glass|cup|mug|silverware|cutlery|serving)\b/i,
  ],
  'Bedding & Linens': [
    /\b(bedding|linen|sheet|pillow|blanket|duvet|comforter|throw|towel)\b/i,
  ],
  'Candles & Fragrance': [
    /\b(candle|scent|fragrance|aroma|incense|diffuser|perfume|smell)\b/i,
  ],
  'Plants & Gardening': [
    /\b(plant|garden|gardening|flower|succulent|herb|grow|pot|planter|seed|soil)\b/i,
  ],
  'Furniture': [
    /\b(furniture|chair|table|desk|shelf|cabinet|storage|bench|stool)\b/i,
  ],

  // Fashion & Accessories
  'Fashion & Clothing': [
    /\b(fashion|clothing|apparel|shirt|dress|pants|jacket|coat|sweater|wear)\b/i,
  ],
  'Jewelry': [
    /\b(jewelry|jewellery|necklace|bracelet|ring|earring|pendant|chain|gem|diamond|gold|silver)\b/i,
  ],
  'Watches': [
    /\b(watch|timepiece|clock|chronograph|wristwatch)\b/i,
  ],
  'Bags & Wallets': [
    /\b(bag|purse|wallet|tote|backpack|luggage|handbag|clutch|pouch)\b/i,
  ],
  'Scarves & Accessories': [
    /\b(scarf|accessory|hat|glove|belt|tie|bowtie|sunglasses)\b/i,
  ],

  // Books & Media
  'Books': [
    /\b(book|novel|read|reading|literature|author|fiction|non\s*fiction|hardcover|paperback)\b/i,
  ],
  'Audiobooks & Podcasts': [
    /\b(audiobook|podcast|audio\s*book|listen|narrat)\b/i,
  ],
  'Movies & TV': [
    /\b(movie|film|dvd|blu\s*ray|tv|television|series|streaming)\b/i,
  ],
  'Magazines': [
    /\b(magazine|periodical|publication|issue)\b/i,
  ],

  // Games & Entertainment
  'Games & Puzzles': [
    /\b(game|puzzle|jigsaw|crossword|sudoku|brain\s*teaser)\b/i,
  ],
  'Board Games': [
    /\b(board\s*game|card\s*game|tabletop|chess|checkers|monopoly|strategy)\b/i,
  ],
  'Video Games': [
    /\b(video\s*game|gaming|console|playstation|xbox|nintendo|pc\s*game)\b/i,
  ],
  'Toys': [
    /\b(toy|play|plaything|kid|child|children|baby|doll|action\s*figure)\b/i,
  ],

  // Tech & Gadgets
  'Tech Gadgets': [
    /\b(tech|gadget|device|electronic|digital|smart|wireless|bluetooth)\b/i,
  ],
  'Smart Home': [
    /\b(smart\s*home|automation|alexa|google\s*home|iot|connected)\b/i,
  ],
  'Electronics': [
    /\b(electronic|charger|cable|usb|battery|power|adapter)\b/i,
  ],
  'Phone & Tablet Accessories': [
    /\b(phone|tablet|ipad|iphone|android|case|screen|protector|stylus)\b/i,
  ],

  // Outdoor & Adventure
  'Outdoor & Camping': [
    /\b(outdoor|camping|camp|tent|sleeping\s*bag|backpack|hiking|trail)\b/i,
  ],
  'Sports Equipment': [
    /\b(sport|equipment|ball|racket|racquet|bat|glove|gear)\b/i,
  ],
  'Travel Accessories': [
    /\b(travel|trip|journey|luggage|suitcase|passport|packing|airplane)\b/i,
  ],
  'Hiking & Climbing': [
    /\b(hiking|climb|climbing|mountain|trek|trekking|summit|trail)\b/i,
  ],

  // Hobbies & Interests
  'Pets & Pet Supplies': [
    /\b(pet|dog|cat|puppy|kitten|animal|collar|leash|toy|treat)\b/i,
  ],
  'Automotive': [
    /\b(car|auto|automotive|vehicle|drive|driving|road|mechanic)\b/i,
  ],
  'Collectibles': [
    /\b(collectible|collection|collector|rare|limited\s*edition|vintage|antique)\b/i,
  ],
  'Magic & Novelty': [
    /\b(magic|trick|illusion|novelty|funny|gag|prank|joke)\b/i,
  ],

  // Special Occasions
  'Personalized Gifts': [
    /\b(personalized|personalised|custom|customized|monogram|engraved|name|initial)\b/i,
  ],
  'Baby & Nursery': [
    /\b(baby|nursery|infant|newborn|toddler|onesie|bib|rattle)\b/i,
  ],
  'Wedding & Anniversary': [
    /\b(wedding|anniversary|bride|groom|marriage|married|couple)\b/i,
  ],
  'Office & Desk': [
    /\b(office|desk|workspace|work|professional|organize|organizer|file)\b/i,
  ],
};

/**
 * Infer product categories from title and description
 * Returns all matching categories (products can have multiple)
 *
 * @param title - Product title
 * @param description - Product description (can be null/empty)
 * @returns Array of matched category names
 *
 * @example
 * inferCategories('Premium Pour-Over Coffee Set', 'Hand-crafted ceramic...')
 * // Returns: ['Coffee & Tea', 'Kitchen Gadgets']
 */
export function inferCategories(title: string, description: string | null): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const matched = new Set<string>();

  // Test each category's patterns
  for (const [category, patterns] of Object.entries(CATEGORY_RULES)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matched.add(category);
        break; // One match per category is enough
      }
    }
  }

  return Array.from(matched);
}

/**
 * Get all categories as an array
 * Useful for creating Category nodes in Neo4j
 */
export function getAllCategories(): string[] {
  return [...CATEGORIES];
}

/**
 * Validate if a string is a valid category
 */
export function isValidCategory(category: string): boolean {
  return CATEGORIES.includes(category as Category);
}

/**
 * Get category statistics for a batch of products
 * Useful for debugging and analysis
 */
export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export function getCategoryStats(products: Array<{ title: string; description: string | null }>): CategoryStats[] {
  const categoryCounts = new Map<string, number>();

  // Count categories
  for (const product of products) {
    const categories = inferCategories(product.title, product.description);
    for (const category of categories) {
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }
  }

  // Convert to stats array
  const totalProducts = products.length;
  const stats: CategoryStats[] = [];

  // Use Array.from to avoid iterator issues
  const entries = Array.from(categoryCounts.entries());
  for (const [category, count] of entries) {
    stats.push({
      category,
      count,
      percentage: (count / totalProducts) * 100,
    });
  }

  // Sort by count descending
  return stats.sort((a, b) => b.count - a.count);
}

// ============================================================================
// PART 2: INTEREST TAXONOMY (Phase 2.2 Enhancement)
// ============================================================================

/**
 * Interest taxonomy mapping parent interests to synonyms and related terms
 * Each entry: canonical_interest -> [synonym1, synonym2, ...]
 *
 * Purpose: Fix the 18-interest bottleneck identified in graph audit
 * - Expand from 18 coarse interests to 150+ granular terms
 * - Fix severe under-tagging (hiking: 1 product, yoga: 1 product)
 * - Add long-tail interests: jewelry, books, toys, pets, DIY/crafts
 * - Improve discriminative power for searches
 */
export const INTEREST_TAXONOMY: Record<string, string[]> = {
  // ========== OUTDOOR & ADVENTURE ==========
  'hiking': [
    'hiking', 'trekking', 'backpacking', 'trails', 'trail walking',
    'mountain hiking', 'hill walking', 'nature walks', 'outdoor walking'
  ],
  'camping': [
    'camping', 'glamping', 'backpacking', 'outdoor camping', 'wilderness camping',
    'car camping', 'tent camping', 'bushcraft', 'survival camping'
  ],
  'cycling': [
    'cycling', 'biking', 'bicycling', 'mountain biking', 'road cycling',
    'bike riding', 'bmx', 'cycling tours', 'bike commuting'
  ],
  'outdoors': [
    'outdoors', 'outdoor activities', 'nature', 'wilderness', 'outdoor adventure',
    'outdoor recreation', 'nature lover', 'outdoor enthusiast', 'fresh air'
  ],
  'climbing': [
    'climbing', 'rock climbing', 'bouldering', 'mountaineering', 'indoor climbing',
    'sport climbing', 'trad climbing', 'alpine climbing'
  ],
  'fishing': [
    'fishing', 'fly fishing', 'angling', 'sport fishing', 'ice fishing',
    'deep sea fishing', 'bass fishing', 'fishing trips'
  ],
  'kayaking': [
    'kayaking', 'canoeing', 'paddling', 'sea kayaking', 'whitewater kayaking',
    'paddle boarding', 'rowing'
  ],
  'skiing': [
    'skiing', 'snowboarding', 'downhill skiing', 'cross country skiing',
    'ski trips', 'winter sports', 'snow sports', 'alpine skiing'
  ],
  'running': [
    'running', 'jogging', 'trail running', 'marathon', 'ultra running',
    'distance running', 'sprinting', '5k', '10k', 'half marathon'
  ],
  'surfing': [
    'surfing', 'surf', 'wave riding', 'bodyboarding', 'surf culture',
    'beach sports', 'ocean sports'
  ],

  // ========== FITNESS & WELLNESS ==========
  'fitness': [
    'fitness', 'exercise', 'workout', 'working out', 'training',
    'gym', 'gym workouts', 'physical fitness', 'active lifestyle'
  ],
  'yoga': [
    'yoga', 'yogic', 'asana', 'vinyasa', 'hatha yoga', 'hot yoga',
    'yin yoga', 'power yoga', 'yoga practice', 'yogi'
  ],
  'pilates': [
    'pilates', 'mat pilates', 'reformer pilates', 'core training',
    'pilates studio', 'barre', 'body conditioning'
  ],
  'wellness': [
    'wellness', 'wellbeing', 'self-care', 'holistic health', 'mindfulness',
    'meditation', 'mental health', 'healthy living', 'balance'
  ],
  'weightlifting': [
    'weightlifting', 'weight training', 'strength training', 'powerlifting',
    'bodybuilding', 'lifting weights', 'resistance training', 'crossfit'
  ],
  'martial-arts': [
    'martial arts', 'karate', 'judo', 'taekwondo', 'mma', 'boxing',
    'kickboxing', 'jiu jitsu', 'kung fu', 'self defense'
  ],
  'dancing': [
    'dancing', 'dance', 'ballet', 'ballroom dancing', 'salsa', 'hip hop dance',
    'contemporary dance', 'dance classes', 'choreography'
  ],

  // ========== FOOD & BEVERAGE ==========
  'cooking': [
    'cooking', 'culinary', 'cuisine', 'chef', 'home cooking',
    'culinary arts', 'recipes', 'meal prep', 'kitchen skills'
  ],
  'baking': [
    'baking', 'pastry', 'bread making', 'cake decorating', 'baker',
    'sourdough', 'desserts', 'pastry chef', 'home baking'
  ],
  'coffee': [
    'coffee', 'espresso', 'brewing', 'barista', 'cafe', 'latte', 'cappuccino',
    'coffee roasting', 'coffee beans', 'coffee culture', 'pour over', 'french press'
  ],
  'tea': [
    'tea', 'tea ceremony', 'loose leaf tea', 'matcha', 'chai',
    'herbal tea', 'tea culture', 'tea tasting', 'oolong', 'green tea'
  ],
  'wine': [
    'wine', 'wine tasting', 'sommelier', 'vineyards', 'wine pairing',
    'red wine', 'white wine', 'wine collecting', 'oenology', 'winery'
  ],
  'craft-beer': [
    'craft beer', 'beer', 'brewing', 'homebrewing', 'ipa', 'ale',
    'beer tasting', 'microbrewery', 'beer culture', 'hops'
  ],
  'cocktails': [
    'cocktails', 'mixology', 'bartending', 'craft cocktails', 'spirits',
    'cocktail making', 'home bar', 'drinks', 'bartender'
  ],
  'foodie': [
    'foodie', 'food lover', 'gourmet', 'food enthusiast', 'epicurean',
    'food culture', 'dining', 'restaurants', 'food exploration'
  ],
  'bbq': [
    'bbq', 'barbecue', 'grilling', 'smoking meat', 'pitmaster',
    'outdoor cooking', 'grill master', 'smoker', 'meat smoking'
  ],

  // ========== TECHNOLOGY ==========
  'tech': [
    'tech', 'technology', 'gadgets', 'electronics', 'tech enthusiast',
    'innovation', 'digital', 'tech gadgets', 'tech gear'
  ],
  'gaming': [
    'gaming', 'video games', 'gamer', 'esports', 'console gaming',
    'pc gaming', 'game design', 'streaming games', 'gaming culture'
  ],
  'programming': [
    'programming', 'coding', 'software development', 'developer', 'coder',
    'web development', 'software engineer', 'computer science', 'dev'
  ],
  'smart-home': [
    'smart home', 'home automation', 'iot', 'smart devices', 'connected home',
    'alexa', 'google home', 'smart assistant', 'home tech'
  ],
  'computers': [
    'computers', 'computing', 'pc', 'laptop', 'desktop', 'hardware',
    'computer building', 'tech setup', 'workstation'
  ],
  'drones': [
    'drones', 'drone photography', 'quadcopter', 'aerial photography',
    'fpv', 'drone racing', 'uav'
  ],

  // ========== CREATIVE ARTS ==========
  'art': [
    'art', 'fine art', 'visual art', 'artist', 'artistic',
    'contemporary art', 'art galleries', 'art collecting'
  ],
  'painting': [
    'painting', 'watercolor', 'acrylic painting', 'oil painting', 'canvas',
    'portrait painting', 'landscape painting', 'abstract art'
  ],
  'drawing': [
    'drawing', 'sketching', 'illustration', 'pencil drawing', 'digital art',
    'figure drawing', 'sketch artist', 'charcoal drawing'
  ],
  'photography': [
    'photography', 'photographer', 'photo', 'cameras', 'film photography',
    'portrait photography', 'landscape photography', 'photo editing', 'digital photography'
  ],
  'crafts': [
    'crafts', 'crafting', 'handmade', 'diy', 'craft projects',
    'maker', 'handcrafted', 'artisan crafts', 'craft supplies'
  ],
  'knitting': [
    'knitting', 'crochet', 'yarn', 'fiber arts', 'needlework',
    'knit', 'wool crafts', 'knitting patterns', 'hand knitting'
  ],
  'sewing': [
    'sewing', 'quilting', 'embroidery', 'needlework', 'textile arts',
    'dressmaking', 'tailoring', 'fabric crafts', 'seamstress'
  ],
  'woodworking': [
    'woodworking', 'carpentry', 'woodcraft', 'furniture making', 'wood carving',
    'joinery', 'woodshop', 'wood projects', 'timber work'
  ],
  'pottery': [
    'pottery', 'ceramics', 'clay', 'wheel throwing', 'ceramic arts',
    'kiln', 'pottery wheel', 'handmade pottery', 'stoneware'
  ],
  'jewelry-making': [
    'jewelry making', 'beading', 'metalwork', 'jewelry design', 'silversmithing',
    'handmade jewelry', 'jewelry crafts', 'wire wrapping'
  ],
  'scrapbooking': [
    'scrapbooking', 'scrapbook', 'memory keeping', 'photo albums',
    'paper crafts', 'journaling', 'mixed media'
  ],

  // ========== MUSIC ==========
  'music': [
    'music', 'musician', 'music lover', 'melomane', 'audio',
    'music enthusiast', 'music culture', 'sound'
  ],
  'guitar': [
    'guitar', 'guitarist', 'acoustic guitar', 'electric guitar',
    'bass guitar', 'guitar playing', 'strumming'
  ],
  'piano': [
    'piano', 'pianist', 'keyboard', 'keys', 'piano playing',
    'classical piano', 'jazz piano', 'digital piano'
  ],
  'vinyl': [
    'vinyl', 'vinyl records', 'record collecting', 'turntable', 'lp',
    'vinyl culture', 'record player', 'audiophile', 'analog music'
  ],
  'concerts': [
    'concerts', 'live music', 'music festivals', 'gigs', 'shows',
    'music events', 'concert going', 'festival goer'
  ],
  'singing': [
    'singing', 'vocals', 'vocalist', 'choir', 'karaoke',
    'voice training', 'vocal performance', 'choral'
  ],
  'dj': [
    'dj', 'djing', 'mixing', 'turntables', 'electronic music',
    'club music', 'scratching', 'beat mixing'
  ],

  // ========== READING & LEARNING ==========
  'reading': [
    'reading', 'books', 'literature', 'reader', 'bookworm',
    'book lover', 'bibliophile', 'book club'
  ],
  'fiction': [
    'fiction', 'novels', 'stories', 'literary fiction', 'contemporary fiction',
    'classic literature', 'narrative'
  ],
  'sci-fi': [
    'sci-fi', 'science fiction', 'scifi', 'speculative fiction', 'space opera',
    'cyberpunk', 'dystopian fiction'
  ],
  'fantasy': [
    'fantasy', 'fantasy novels', 'epic fantasy', 'high fantasy',
    'magical realism', 'urban fantasy', 'sword and sorcery'
  ],
  'mystery': [
    'mystery', 'thriller', 'detective stories', 'crime fiction', 'whodunit',
    'suspense', 'mystery novels', 'detective novels'
  ],
  'non-fiction': [
    'non-fiction', 'nonfiction', 'biographies', 'memoirs', 'history books',
    'essays', 'true stories', 'factual books'
  ],
  'audiobooks': [
    'audiobooks', 'audio books', 'listening', 'audible', 'book listening',
    'narrated books', 'audio reading'
  ],
  'poetry': [
    'poetry', 'poems', 'verse', 'poets', 'contemporary poetry',
    'classic poetry', 'spoken word'
  ],

  // ========== GAMES & ENTERTAINMENT ==========
  'board-games': [
    'board games', 'tabletop games', 'board gaming', 'game night',
    'strategy games', 'euro games', 'party games', 'card games'
  ],
  'puzzles': [
    'puzzles', 'jigsaw puzzles', 'puzzle solving', 'brain teasers',
    'logic puzzles', 'crosswords', 'sudoku', 'puzzle games'
  ],
  'chess': [
    'chess', 'chess player', 'chess strategy', 'chess club',
    'chess tournaments', 'chess puzzles', 'chess game'
  ],
  'trivia': [
    'trivia', 'quiz games', 'trivia nights', 'pub quiz',
    'general knowledge', 'trivia competitions'
  ],

  // ========== HOME & GARDEN ==========
  'gardening': [
    'gardening', 'garden', 'plants', 'horticulture', 'green thumb',
    'garden design', 'urban gardening', 'landscaping', 'gardener'
  ],
  'houseplants': [
    'houseplants', 'indoor plants', 'plant care', 'plant parent',
    'plant collecting', 'succulents', 'tropical plants', 'plant lover'
  ],
  'flowers': [
    'flowers', 'floral', 'flower arranging', 'floristry', 'bouquets',
    'cut flowers', 'flower gardens', 'blooms'
  ],
  'home-decor': [
    'home decor', 'interior design', 'home styling', 'decorating',
    'home aesthetics', 'interior decorating', 'home improvement'
  ],
  'organizing': [
    'organizing', 'organization', 'decluttering', 'home organization',
    'storage solutions', 'minimalism', 'tidy', 'konmari'
  ],

  // ========== PETS & ANIMALS ==========
  'pets': [
    'pets', 'pet care', 'pet owner', 'animal lover', 'pet parent',
    'companion animals', 'pet keeping'
  ],
  'dogs': [
    'dogs', 'dog owner', 'dog lover', 'canine', 'puppy', 'dog training',
    'dog care', 'dog walking', 'doggo', 'pup'
  ],
  'cats': [
    'cats', 'cat owner', 'cat lover', 'feline', 'kitten', 'cat care',
    'kitty', 'cat parent', 'meow'
  ],
  'aquarium': [
    'aquarium', 'fish keeping', 'fishkeeping', 'aquatics', 'reef tank',
    'tropical fish', 'fish tank', 'aquarist', 'marine life'
  ],
  'birds': [
    'birds', 'bird watching', 'birding', 'ornithology', 'bird keeping',
    'backyard birds', 'bird feeders', 'aviary'
  ],

  // ========== FASHION & STYLE ==========
  'fashion': [
    'fashion', 'style', 'fashionista', 'clothing', 'apparel',
    'fashion trends', 'fashion design', 'wardrobe', 'outfit styling'
  ],
  'jewelry': [
    'jewelry', 'jewellery', 'accessories', 'necklaces', 'earrings',
    'rings', 'bracelets', 'fine jewelry', 'costume jewelry'
  ],
  'watches': [
    'watches', 'timepieces', 'watch collecting', 'horology', 'wristwatches',
    'watch enthusiast', 'mechanical watches', 'luxury watches'
  ],
  'sneakers': [
    'sneakers', 'kicks', 'trainers', 'sneaker culture', 'sneakerhead',
    'athletic shoes', 'sneaker collecting', 'footwear'
  ],
  'handbags': [
    'handbags', 'purses', 'bags', 'designer bags', 'totes',
    'clutches', 'crossbody bags', 'leather bags'
  ],

  // ========== BEAUTY & GROOMING ==========
  'beauty': [
    'beauty', 'cosmetics', 'beauty products', 'beauty routine',
    'beauty care', 'beauty enthusiast', 'glamour'
  ],
  'skincare': [
    'skincare', 'skin care', 'facial care', 'beauty routine', 'serums',
    'moisturizer', 'cleansers', 'face masks', 'skin health'
  ],
  'makeup': [
    'makeup', 'cosmetics', 'beauty makeup', 'lipstick', 'foundation',
    'eyeshadow', 'makeup artist', 'beauty products'
  ],
  'fragrance': [
    'fragrance', 'perfume', 'cologne', 'scent', 'eau de parfum',
    'perfumery', 'fragrance collection', 'aromatics'
  ],
  'haircare': [
    'haircare', 'hair care', 'hair styling', 'hair products', 'shampoo',
    'conditioner', 'hair health', 'hair treatment'
  ],

  // ========== TRAVEL ==========
  'travel': [
    'travel', 'traveling', 'travelling', 'wanderlust', 'exploration',
    'adventures', 'destinations', 'trips', 'globetrotting', 'tourism'
  ],
  'adventure-travel': [
    'adventure travel', 'adventure trips', 'expedition', 'trekking trips',
    'adventure tourism', 'outdoor travel', 'active travel'
  ],
  'luxury-travel': [
    'luxury travel', 'luxury vacations', 'premium travel', 'upscale travel',
    'luxury hotels', 'first class travel', 'resort vacations'
  ],
  'backpacking': [
    'backpacking', 'backpacker', 'budget travel', 'hostel travel',
    'independent travel', 'gap year', 'world travel'
  ],

  // ========== HOBBIES & INTERESTS ==========
  'collecting': [
    'collecting', 'collections', 'collector', 'collectibles', 'memorabilia',
    'antiques', 'vintage items', 'rare items'
  ],
  'history': [
    'history', 'historical', 'history buff', 'historian', 'historical events',
    'world history', 'military history', 'ancient history'
  ],
  'science': [
    'science', 'scientific', 'stem', 'physics', 'chemistry', 'biology',
    'astronomy', 'science enthusiast', 'science nerd'
  ],
  'astronomy': [
    'astronomy', 'stargazing', 'astrophotography', 'space', 'telescopes',
    'celestial', 'planets', 'stars', 'cosmos'
  ],
  'cars': [
    'cars', 'automobiles', 'car enthusiast', 'auto', 'vehicles',
    'car culture', 'car restoration', 'classic cars', 'racing'
  ],
  'motorcycles': [
    'motorcycles', 'biking', 'motorbikes', 'riding', 'motorcycle culture',
    'harley', 'sportbikes', 'cruisers', 'moto'
  ],

  // ========== KIDS & FAMILY ==========
  'toys': [
    'toys', 'playtime', 'toy collecting', 'play', 'kids toys',
    'action figures', 'dolls', 'toy cars', 'educational toys'
  ],
  'lego': [
    'lego', 'building blocks', 'lego sets', 'brick building',
    'lego enthusiast', 'lego construction', 'lego collector'
  ],
  'parenting': [
    'parenting', 'parent', 'family', 'childcare', 'kids',
    'children', 'family life', 'raising kids', 'mom', 'dad'
  ],

  // ========== PROFESSIONAL & BUSINESS ==========
  'professional-development': [
    'professional development', 'career', 'career growth', 'business skills',
    'leadership', 'management', 'professional skills', 'workplace'
  ],
  'entrepreneurship': [
    'entrepreneurship', 'entrepreneur', 'startup', 'business owner',
    'small business', 'startups', 'side hustle', 'business building'
  ],
  'productivity': [
    'productivity', 'organization', 'efficiency', 'time management',
    'productivity tools', 'getting things done', 'workflow'
  ],

  // ========== SPIRITUALITY & MINDFULNESS ==========
  'spirituality': [
    'spirituality', 'spiritual practice', 'mindfulness', 'consciousness',
    'spiritual growth', 'zen', 'enlightenment', 'inner peace'
  ],
  'meditation': [
    'meditation', 'mindfulness meditation', 'contemplation', 'meditative',
    'mindfulness practice', 'breathing exercises', 'calm'
  ],

  // ========== SOCIAL & ENTERTAINMENT ==========
  'movies': [
    'movies', 'films', 'cinema', 'film buff', 'movie lover',
    'movie watching', 'film enthusiast', 'cinephile'
  ],
  'tv-shows': [
    'tv shows', 'television', 'series', 'binge watching', 'streaming',
    'tv series', 'shows', 'netflix'
  ],
  'podcasts': [
    'podcasts', 'podcast listening', 'audio content', 'podcast fan',
    'podcast enthusiast', 'podcast shows'
  ],
  'comedy': [
    'comedy', 'humor', 'stand-up', 'comedians', 'jokes',
    'funny', 'comedy shows', 'laughter'
  ],
  'theater': [
    'theater', 'theatre', 'plays', 'broadway', 'musicals',
    'stage performance', 'drama', 'theatrical'
  ],
};

/**
 * Reverse index: term -> canonical interest
 * Built automatically from INTEREST_TAXONOMY
 */
let TERM_TO_CANONICAL: Map<string, string> | null = null;

function buildTermToCanonical(): Map<string, string> {
  if (TERM_TO_CANONICAL) return TERM_TO_CANONICAL;

  TERM_TO_CANONICAL = new Map();

  for (const [canonical, terms] of Object.entries(INTEREST_TAXONOMY)) {
    for (const term of terms) {
      const normalized = term.toLowerCase().trim();
      TERM_TO_CANONICAL.set(normalized, canonical);
    }
  }

  return TERM_TO_CANONICAL;
}

/**
 * Normalize a single interest to its canonical form
 *
 * @param interest - The interest string to normalize
 * @returns The canonical interest name, or the original if no mapping exists
 *
 * @example
 * normalizeInterest('video games') // => 'gaming'
 * normalizeInterest('espresso') // => 'coffee'
 * normalizeInterest('unknown-thing') // => 'unknown-thing'
 */
export function normalizeInterest(interest: string): string {
  const termMap = buildTermToCanonical();
  const normalized = interest.toLowerCase().trim();

  // Direct match
  if (termMap.has(normalized)) {
    return termMap.get(normalized)!;
  }

  // Partial match (contains) - use Array.from for TS compatibility
  const entries = Array.from(termMap.entries());
  for (const [term, canonical] of entries) {
    if (normalized.includes(term) || term.includes(normalized)) {
      return canonical;
    }
  }

  // No match - return original (preserve unknown interests)
  return interest;
}

/**
 * Expand a list of interests to include related canonical interests
 *
 * @param interests - Array of interest strings
 * @returns Array of canonical interests (deduplicated)
 *
 * @example
 * expandInterests(['video games', 'espresso'])
 * // => ['gaming', 'coffee']
 *
 * expandInterests(['hiking', 'trekking', 'trails'])
 * // => ['hiking'] (all normalize to same canonical)
 */
export function expandInterests(interests: string[]): string[] {
  const canonicalSet = new Set<string>();

  for (const interest of interests) {
    if (!interest) continue;
    const canonical = normalizeInterest(interest);
    canonicalSet.add(canonical);
  }

  return Array.from(canonicalSet);
}

/**
 * Get related interests for a given interest
 * Returns semantically related canonical interests based on category groupings
 *
 * @param interest - The interest to find relations for
 * @returns Array of related canonical interests
 *
 * @example
 * getRelatedInterests('hiking')
 * // => ['camping', 'outdoors', 'climbing', 'cycling']
 *
 * getRelatedInterests('coffee')
 * // => ['tea', 'cooking', 'foodie']
 */
export function getRelatedInterests(interest: string): string[] {
  const canonical = normalizeInterest(interest);

  // Category groupings for related interests
  const relatedGroups: Record<string, string[]> = {
    // Outdoor cluster
    'hiking': ['camping', 'outdoors', 'climbing', 'cycling', 'running', 'fishing'],
    'camping': ['hiking', 'outdoors', 'fishing', 'climbing', 'backpacking'],
    'cycling': ['hiking', 'outdoors', 'running', 'fitness'],
    'outdoors': ['hiking', 'camping', 'fishing', 'climbing', 'cycling'],
    'climbing': ['hiking', 'outdoors', 'camping', 'fitness'],
    'fishing': ['camping', 'outdoors', 'kayaking'],
    'kayaking': ['fishing', 'outdoors', 'camping', 'surfing'],
    'skiing': ['outdoors', 'travel', 'adventure-travel'],
    'running': ['fitness', 'outdoors', 'cycling', 'hiking'],
    'surfing': ['outdoors', 'kayaking', 'travel'],

    // Fitness cluster
    'fitness': ['yoga', 'pilates', 'wellness', 'weightlifting', 'running'],
    'yoga': ['fitness', 'wellness', 'meditation', 'pilates'],
    'pilates': ['fitness', 'yoga', 'wellness'],
    'wellness': ['yoga', 'meditation', 'fitness', 'spirituality'],
    'weightlifting': ['fitness', 'wellness'],
    'martial-arts': ['fitness', 'wellness'],
    'dancing': ['fitness', 'music', 'wellness'],

    // Food & drink cluster
    'cooking': ['baking', 'foodie', 'bbq', 'coffee', 'wine'],
    'baking': ['cooking', 'foodie', 'coffee', 'tea'],
    'coffee': ['tea', 'cooking', 'foodie'],
    'tea': ['coffee', 'wellness', 'foodie'],
    'wine': ['foodie', 'cooking', 'craft-beer', 'cocktails'],
    'craft-beer': ['wine', 'cocktails', 'foodie'],
    'cocktails': ['wine', 'craft-beer', 'foodie'],
    'foodie': ['cooking', 'baking', 'wine', 'coffee', 'bbq'],
    'bbq': ['cooking', 'foodie', 'outdoors'],

    // Tech cluster
    'tech': ['gaming', 'programming', 'smart-home', 'computers'],
    'gaming': ['tech', 'board-games', 'computers'],
    'programming': ['tech', 'computers', 'productivity'],
    'smart-home': ['tech', 'home-decor', 'productivity'],
    'computers': ['tech', 'programming', 'gaming'],
    'drones': ['tech', 'photography', 'outdoors'],

    // Creative arts cluster
    'art': ['painting', 'drawing', 'photography', 'crafts'],
    'painting': ['art', 'drawing', 'crafts'],
    'drawing': ['art', 'painting', 'crafts'],
    'photography': ['art', 'travel', 'drones', 'tech'],
    'crafts': ['art', 'knitting', 'sewing', 'woodworking', 'jewelry-making'],
    'knitting': ['crafts', 'sewing'],
    'sewing': ['crafts', 'knitting', 'fashion'],
    'woodworking': ['crafts', 'home-decor'],
    'pottery': ['crafts', 'art', 'home-decor'],
    'jewelry-making': ['crafts', 'art', 'jewelry', 'fashion'],
    'scrapbooking': ['crafts', 'photography', 'art'],

    // Music cluster
    'music': ['guitar', 'piano', 'vinyl', 'concerts', 'singing'],
    'guitar': ['music', 'piano', 'singing'],
    'piano': ['music', 'guitar', 'singing'],
    'vinyl': ['music', 'concerts', 'collecting'],
    'concerts': ['music', 'vinyl', 'travel'],
    'singing': ['music', 'guitar', 'piano'],
    'dj': ['music', 'concerts', 'tech'],

    // Reading cluster
    'reading': ['fiction', 'non-fiction', 'audiobooks', 'poetry'],
    'fiction': ['reading', 'sci-fi', 'fantasy', 'mystery'],
    'sci-fi': ['reading', 'fiction', 'fantasy', 'tech'],
    'fantasy': ['reading', 'fiction', 'sci-fi', 'gaming'],
    'mystery': ['reading', 'fiction', 'podcasts'],
    'non-fiction': ['reading', 'history', 'science', 'audiobooks'],
    'audiobooks': ['reading', 'podcasts', 'fiction'],
    'poetry': ['reading', 'art'],

    // Games cluster
    'board-games': ['gaming', 'puzzles', 'chess', 'trivia'],
    'puzzles': ['board-games', 'chess', 'trivia'],
    'chess': ['board-games', 'puzzles'],
    'trivia': ['board-games', 'puzzles', 'podcasts'],

    // Home & garden cluster
    'gardening': ['houseplants', 'flowers', 'outdoors', 'home-decor'],
    'houseplants': ['gardening', 'flowers', 'home-decor'],
    'flowers': ['gardening', 'houseplants', 'home-decor'],
    'home-decor': ['organizing', 'woodworking', 'pottery', 'houseplants'],
    'organizing': ['home-decor', 'productivity'],

    // Pets cluster
    'pets': ['dogs', 'cats', 'aquarium', 'birds'],
    'dogs': ['pets', 'outdoors', 'hiking'],
    'cats': ['pets', 'home-decor'],
    'aquarium': ['pets', 'science', 'home-decor'],
    'birds': ['pets', 'outdoors'],

    // Fashion cluster
    'fashion': ['jewelry', 'watches', 'sneakers', 'handbags', 'beauty'],
    'jewelry': ['fashion', 'jewelry-making', 'watches'],
    'watches': ['fashion', 'jewelry', 'collecting'],
    'sneakers': ['fashion', 'fitness', 'collecting'],
    'handbags': ['fashion', 'jewelry'],

    // Beauty cluster
    'beauty': ['skincare', 'makeup', 'fragrance', 'haircare', 'wellness'],
    'skincare': ['beauty', 'wellness', 'makeup'],
    'makeup': ['beauty', 'skincare', 'fashion'],
    'fragrance': ['beauty', 'fashion'],
    'haircare': ['beauty', 'wellness'],

    // Travel cluster
    'travel': ['adventure-travel', 'luxury-travel', 'backpacking', 'photography'],
    'adventure-travel': ['travel', 'hiking', 'outdoors', 'backpacking'],
    'luxury-travel': ['travel', 'wine', 'foodie'],
    'backpacking': ['travel', 'adventure-travel', 'camping', 'hiking'],

    // Other clusters
    'collecting': ['vinyl', 'watches', 'toys', 'lego', 'sneakers'],
    'history': ['reading', 'travel', 'non-fiction'],
    'science': ['astronomy', 'reading', 'tech', 'non-fiction'],
    'astronomy': ['science', 'photography', 'outdoors'],
    'cars': ['motorcycles', 'tech', 'collecting'],
    'motorcycles': ['cars', 'outdoors', 'adventure-travel'],

    // Kids & family
    'toys': ['lego', 'parenting', 'collecting'],
    'lego': ['toys', 'collecting'],
    'parenting': ['toys'],

    // Professional
    'professional-development': ['entrepreneurship', 'productivity', 'reading'],
    'entrepreneurship': ['professional-development', 'productivity'],
    'productivity': ['professional-development', 'tech', 'organizing'],

    // Spirituality
    'spirituality': ['meditation', 'wellness', 'yoga'],
    'meditation': ['spirituality', 'wellness', 'yoga'],

    // Entertainment
    'movies': ['tv-shows', 'theater', 'comedy'],
    'tv-shows': ['movies', 'podcasts'],
    'podcasts': ['audiobooks', 'tv-shows', 'comedy', 'trivia'],
    'comedy': ['movies', 'theater', 'podcasts'],
    'theater': ['movies', 'music', 'art'],
  };

  return relatedGroups[canonical] || [];
}

/**
 * Get all terms (synonyms) for a canonical interest
 *
 * @param canonical - The canonical interest name
 * @returns Array of all terms/synonyms for this interest
 *
 * @example
 * getAllTerms('coffee')
 * // => ['coffee', 'espresso', 'brewing', 'barista', 'cafe', ...]
 */
export function getAllTerms(canonical: string): string[] {
  return INTEREST_TAXONOMY[canonical] || [canonical];
}

/**
 * Get total count of interests and terms in taxonomy
 *
 * @returns Statistics about the taxonomy
 */
export function getTaxonomyStats(): {
  totalCanonicalInterests: number;
  totalTerms: number;
  avgTermsPerInterest: number;
} {
  const totalCanonicalInterests = Object.keys(INTEREST_TAXONOMY).length;
  const totalTerms = Object.values(INTEREST_TAXONOMY)
    .reduce((sum, terms) => sum + terms.length, 0);

  return {
    totalCanonicalInterests,
    totalTerms,
    avgTermsPerInterest: Number((totalTerms / totalCanonicalInterests).toFixed(1)),
  };
}

/**
 * Search for interests matching a query string
 * Useful for autocomplete or search features
 *
 * @param query - Search query
 * @param limit - Maximum results to return
 * @returns Array of matching canonical interests
 *
 * @example
 * searchInterests('coffe')
 * // => ['coffee']
 *
 * searchInterests('outdoor')
 * // => ['outdoors', 'adventure-travel']
 */
export function searchInterests(query: string, limit: number = 10): string[] {
  if (!query) return [];

  const termMap = buildTermToCanonical();
  const queryLower = query.toLowerCase().trim();
  const matches = new Set<string>();

  // Search through all terms - use Array.from for TS compatibility
  const entries = Array.from(termMap.entries());
  for (const [term, canonical] of entries) {
    if (term.includes(queryLower) || queryLower.includes(term)) {
      matches.add(canonical);
      if (matches.size >= limit) break;
    }
  }

  return Array.from(matches);
}
