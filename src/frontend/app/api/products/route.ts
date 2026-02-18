import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const interest = searchParams.get('interest') || 'all';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '1000');
    const limit = parseInt(searchParams.get('limit') || '50');

    // TODO: Replace with actual Neo4j query to fetch products
    // This should query the Product nodes with filters
    const mockProducts = [
      {
        id: 'prod-001',
        name: "L'Atelier Vert Votive Set",
        description: 'Eco-friendly candle set with garden-inspired scents',
        price: 79.0,
        vendor: 'Artisan Candles Co',
        category: 'Home & Garden',
        facets: ['sustainable', 'handmade', 'scented'],
        interests: ['gardening', 'home-decor'],
      },
      {
        id: 'prod-002',
        name: 'Eco Modern Apron (Forest)',
        description: 'Sustainable cooking apron made from organic cotton',
        price: 79.0,
        vendor: 'Green Kitchen',
        category: 'Kitchen & Dining',
        facets: ['organic', 'sustainable', 'functional'],
        interests: ['cooking', 'sustainability'],
      },
      {
        id: 'prod-003',
        name: 'Coffee Duo',
        description: 'Premium coffee gift set with two artisan blends',
        price: 72.0,
        vendor: 'Roasters Guild',
        category: 'Food & Beverage',
        facets: ['gourmet', 'gift-set', 'artisan'],
        interests: ['coffee'],
      },
    ];

    // Apply filters
    let filteredProducts = mockProducts.filter((product) => {
      const matchesSearch =
        !search || product.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || product.category === category;
      const matchesInterest =
        interest === 'all' || product.interests.includes(interest);
      const matchesPrice = product.price >= minPrice && product.price <= maxPrice;

      return matchesSearch && matchesCategory && matchesInterest && matchesPrice;
    });

    return NextResponse.json({
      products: filteredProducts.slice(0, limit),
      total: filteredProducts.length,
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
