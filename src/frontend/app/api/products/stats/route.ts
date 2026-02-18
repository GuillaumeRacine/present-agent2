import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Replace with actual Neo4j query to get product statistics
    const mockStats = {
      totalProducts: 41686,
      totalFacets: 105731,
      totalCategories: 27,
      topCategories: [
        { name: 'Home & Garden', count: 8234 },
        { name: 'Kitchen & Dining', count: 6521 },
        { name: 'Food & Beverage', count: 5892 },
        { name: 'Fashion & Accessories', count: 4765 },
        { name: 'Books & Media', count: 3987 },
      ],
      topInterests: [
        { name: 'gardening', count: 2341 },
        { name: 'cooking', count: 2156 },
        { name: 'coffee', count: 1842 },
        { name: 'reading', count: 1654 },
        { name: 'art', count: 1432 },
      ],
    };

    return NextResponse.json(mockStats);
  } catch (error) {
    console.error('Product stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product stats' },
      { status: 500 }
    );
  }
}
