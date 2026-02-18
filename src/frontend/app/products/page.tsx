'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  vendor: string;
  category: string;
  facets: string[];
  interests: string[];
}

interface ProductStats {
  totalProducts: number;
  totalFacets: number;
  totalCategories: number;
  topCategories: { name: string; count: number }[];
  topInterests: { name: string; count: number }[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [interestFilter, setInterestFilter] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, interestFilter, priceRange]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/products/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        category: categoryFilter,
        interest: interestFilter,
        minPrice: priceRange[0].toString(),
        maxPrice: priceRange[1].toString(),
        limit: '50',
      });
      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalProducts.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Facets</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalFacets.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalCategories}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Price</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${((priceRange[0] + priceRange[1]) / 2).toFixed(0)}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Panel - Filters */}
        <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Filters
          </h2>

          {/* Search */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">All Categories</option>
              {stats?.topCategories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
          </div>

          {/* Interest Filter */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Interest
            </label>
            <select
              value={interestFilter}
              onChange={(e) => setInterestFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">All Interests</option>
              {stats?.topInterests.map((interest) => (
                <option key={interest.name} value={interest.name}>
                  {interest.name} ({interest.count})
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Price Range: ${priceRange[0]} - ${priceRange[1]}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="1000"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="1000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full"
              />
            </div>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearch('');
              setCategoryFilter('all');
              setInterestFilter('all');
              setPriceRange([0, 1000]);
            }}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Reset Filters
          </button>
        </div>

        {/* Middle Panel - Product Grid */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Products ({products.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No products found matching your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    selectedProduct?.id === product.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-lg'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary-300 hover:shadow'
                  }`}
                >
                  <div className="aspect-square bg-gray-200 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-4xl">🎁</span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {product.vendor}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {product.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Product Details */}
        <div className="w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 overflow-y-auto">
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="aspect-square bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                <span className="text-6xl">🎁</span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  by {selectedProduct.vendor}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  ${selectedProduct.price.toFixed(2)}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                  {selectedProduct.category}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedProduct.description || 'No description available'}
                </p>
              </div>

              {selectedProduct.interests && selectedProduct.interests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.interests.map((interest, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.facets && selectedProduct.facets.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Facets
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.facets.map((facet, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                      >
                        {facet}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Product ID
                </h3>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  {selectedProduct.id}
                </code>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <span className="text-4xl">📦</span>
                <p className="mt-2 text-sm">Select a product to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
