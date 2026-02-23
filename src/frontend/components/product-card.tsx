'use client';

import { useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';

interface ProductCardProps {
  rank: number;
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    vendor: string;
    imageUrl?: string;
    url?: string;
  };
  reasoning: string;
  confidence: number;
  tags?: string[];
  onSelect?: (selected: boolean) => void;
  isSelected?: boolean;
  onFeedback?: (type: 'like' | 'dislike' | 'purchase') => void;
  feedbackBusy?: boolean;
}

export function ProductCard({
  rank,
  product,
  reasoning,
  confidence,
  onSelect,
  isSelected = false,
  onFeedback,
  feedbackBusy = false
}: ProductCardProps) {
  return (
    <div
      className={`border bg-card overflow-hidden transition-all ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-muted-foreground/30'
      }`}
    >
      <div className="flex gap-3 relative">
        {/* Selection Checkbox */}
        {onSelect && (
          <button
            onClick={() => onSelect(!isSelected)}
            className="absolute top-2 right-2 z-10 w-6 h-6 rounded-sm border-2 border-border bg-background flex items-center justify-center hover:border-primary transition-colors"
            aria-label={isSelected ? 'Deselect product' : 'Select product'}
          >
            {isSelected && <Check className="w-4 h-4 text-primary" />}
          </button>
        )}

        {/* Product Image */}
        {product.imageUrl && (
          <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-muted">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image on error
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground shrink-0">#{rank}</span>
            <div className="flex-1 min-w-0">
              {(product.url || product.id?.startsWith('http')) ? (
                <a
                  href={product.url || product.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm sm:text-base font-medium text-foreground hover:text-primary hover:underline line-clamp-2 transition-colors"
                >
                  {product.title}
                </a>
              ) : (
                <h3 className="text-sm sm:text-base font-medium text-foreground line-clamp-2">{product.title}</h3>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="truncate">{product.vendor}</span>
                <span className="hidden sm:inline">·</span>
                <span className="text-foreground font-medium">${product.price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">{product.description}</p>

          <div className="text-xs sm:text-sm text-foreground pt-2 border-t border-border">
            <span className="text-muted-foreground text-xs block mb-1">Why this gift?</span>
            {reasoning}
          </div>

          {/* Confidence bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {(product.url || product.id?.startsWith('http')) && (
              <a
                href={product.url || product.id}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
              >
                View Product <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {onFeedback && (
              <>
                <button
                  disabled={feedbackBusy}
                  onClick={() => onFeedback('like')}
                  className="text-xs px-2 py-1 border border-border hover:border-green-500 hover:text-green-600 transition-colors"
                  aria-label="I like this recommendation"
                >
                  👍 Like
                </button>
                <button
                  disabled={feedbackBusy}
                  onClick={() => onFeedback('dislike')}
                  className="text-xs px-2 py-1 border border-border hover:border-red-500 hover:text-red-600 transition-colors"
                  aria-label="I don't like this recommendation"
                >
                  👎 Dislike
                </button>
                <button
                  disabled={feedbackBusy}
                  onClick={() => onFeedback('purchase')}
                  className="text-xs px-2 py-1 border border-border hover:border-primary hover:text-primary transition-colors"
                  aria-label="I purchased this"
                >
                  🛒 Purchased
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
