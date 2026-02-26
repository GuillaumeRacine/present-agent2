'use client';

import { X, Check, Minus } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  isDigital?: boolean;
  vendor: string;
  imageUrl?: string;
}

function formatPriceDisplay(product: Product): string {
  if (product.minPrice != null && product.maxPrice != null) {
    return `$${product.minPrice.toFixed(0)} - $${product.maxPrice.toFixed(0)}`;
  }
  return `$${product.price.toFixed(2)}`;
}

interface ComparisonItem {
  product: Product;
  reasoning: string;
  confidence: number;
  rank: number;
}

interface ProductComparisonProps {
  items: ComparisonItem[];
  onClose: () => void;
}

export function ProductComparison({ items, onClose }: ProductComparisonProps) {
  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-foreground">
              Compare Products ({items.length})
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-sm transition-colors"
              aria-label="Close comparison"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="bg-card border border-border overflow-hidden flex flex-col"
              >
                {/* Rank Badge */}
                <div className="px-4 py-2 bg-muted border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">
                    #{item.rank} Recommendation
                  </span>
                </div>

                {/* Product Image */}
                {item.product.imageUrl && (
                  <div className="w-full aspect-square bg-muted">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Product Info */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      {item.product.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {item.product.vendor}
                    </p>
                  </div>

                  <div className="text-lg font-medium text-foreground">
                    {formatPriceDisplay(item.product)}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
                    {item.product.description}
                  </p>

                  {/* Reasoning */}
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">
                      Why this gift?
                    </p>
                    <p className="text-xs text-foreground">
                      {item.reasoning}
                    </p>
                  </div>

                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Comparison Table (Mobile: Horizontal Scroll) */}
          <div className="mt-8 bg-card border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">
                Feature Comparison
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium sticky left-0 bg-card">
                      Feature
                    </th>
                    {items.map((item) => (
                      <th
                        key={item.product.id}
                        className="px-4 py-3 text-left text-foreground font-medium min-w-[200px]"
                      >
                        <div className="truncate">{item.product.title}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-muted-foreground sticky left-0 bg-card">
                      Price
                    </td>
                    {items.map((item) => (
                      <td key={item.product.id} className="px-4 py-3 text-foreground">
                        {formatPriceDisplay(item.product)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-muted-foreground sticky left-0 bg-card">
                      Vendor
                    </td>
                    {items.map((item) => (
                      <td key={item.product.id} className="px-4 py-3 text-foreground">
                        {item.product.vendor}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-muted-foreground sticky left-0 bg-card">
                      Confidence
                    </td>
                    {items.map((item) => (
                      <td key={item.product.id} className="px-4 py-3 text-foreground">
                        {(item.confidence * 100).toFixed(0)}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-muted-foreground sticky left-0 bg-card">
                      Rank
                    </td>
                    {items.map((item) => (
                      <td key={item.product.id} className="px-4 py-3 text-foreground">
                        #{item.rank}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
