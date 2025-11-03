interface ProductCardProps {
  rank: number;
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    vendor: string;
    imageUrl?: string;
  };
  reasoning: string;
  confidence: number;
  tags?: string[];
}

export function ProductCard({ rank, product, reasoning, confidence }: ProductCardProps) {
  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="flex gap-3">
        {/* Product Image */}
        {product.imageUrl && (
          <div className="w-24 h-24 shrink-0 bg-muted">
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
        <div className="flex-1 min-w-0 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground shrink-0">#{rank}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">{product.title}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{product.vendor}</span>
                <span>·</span>
                <span className="text-foreground">${product.price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>

          <div className="text-xs text-foreground pt-1 border-t border-border">
            {reasoning}
          </div>

          <div className="text-xs text-muted-foreground">
            {(confidence * 100).toFixed(0)}% confidence
          </div>
        </div>
      </div>
    </div>
  );
}
