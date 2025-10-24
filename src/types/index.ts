/**
 * Type Definitions for Present-Agent2
 */

// Export agent types
export * from './agents';

// ============================================================================
// Neo4j Node Types
// ============================================================================

export interface ProductNode {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  vendor: string;
  productType: string;
  available: boolean;
  imageUrl?: string;
  url?: string;
  embedding: number[]; // 1536-dimensional vector
}

export interface CategoryNode {
  name: string; // Unique category name
  description?: string;
}

// ============================================================================
// Search & Recommendation Types
// ============================================================================

export interface SearchContext {
  query: string;
  recipient?: string;
  occasion?: string;
  interests?: string[];
  budget: {
    min: number;
    max: number;
  };
  excludeProductIds?: string[];
}

export interface ExtractedContext {
  recipient?: string;
  occasion?: string;
  interests: string[];
  priceRange: {
    min: number;
    max: number;
  };
  categories: string[];
  sentiment?: 'casual' | 'formal' | 'playful' | 'serious';
  urgency?: 'immediate' | 'planned' | 'future';
}

export interface Recommendation {
  product: ProductNode;
  score: number; // Combined hybrid score (0-1)
  confidence: number; // Confidence in recommendation (0-1)
  rationale: string; // LLM-generated explanation
  scoring: {
    vectorScore: number; // Vector similarity (0-1)
    graphScore: number; // Graph relevance (0-1)
    categoryBoost: number; // Category relevance boost
  };
}

// ============================================================================
// LLM Types
// ============================================================================

export interface LLMContextExtraction {
  model: string;
  extractedContext: ExtractedContext;
  tokensUsed: number;
  executionTimeMs: number;
}

export interface RationaleRequest {
  product: ProductNode;
  userContext: SearchContext;
  extractedContext: ExtractedContext;
}

export interface RationaleResponse {
  rationale: string;
  model: string;
  tokensUsed: number;
  executionTimeMs: number;
}

// ============================================================================
// Data Ingestion Types
// ============================================================================

export interface RawProduct {
  id: string;
  title: string;
  body_html?: string;
  vendor: string;
  product_type: string;
  variants?: Array<{
    price: string;
    available: boolean;
  }>;
  images?: Array<{
    src: string;
  }>;
}

export interface IngestionProgress {
  stage: 'products' | 'categories' | 'relationships' | 'embeddings';
  processed: number;
  total: number;
  batchNumber?: number;
  errors: Array<{ id: string; error: string }>;
}

// ============================================================================
// Benchmark Types
// ============================================================================

export interface BenchmarkQuery {
  id: string;
  query: string;
  context: SearchContext;
  expectedCategories?: string[];
  expectedPriceRange?: { min: number; max: number };
}

export interface BenchmarkResult {
  queryId: string;
  query: string;
  recommendations: Recommendation[];
  metrics: {
    executionTimeMs: number;
    vectorSearchTimeMs: number;
    graphTraversalTimeMs: number;
    scoringTimeMs: number;
    llmExtractionTimeMs: number;
    rationaleGenerationTimeMs: number;
    avgScore: number;
    avgConfidence: number;
    priceAccuracy?: number; // % of results in expected price range
    categoryAccuracy?: number; // % of results in expected categories
  };
}

export interface BenchmarkSuite {
  name: string;
  queries: BenchmarkQuery[];
  results: BenchmarkResult[];
  summary: {
    totalQueries: number;
    avgExecutionTimeMs: number;
    avgScore: number;
    avgConfidence: number;
    successRate: number;
  };
}
