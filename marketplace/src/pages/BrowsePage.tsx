import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useListingStore } from '@/store/listingStore';
import { ListingGrid } from '@/components/listings';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { cn, CONDITION_OPTIONS, SORT_OPTIONS } from '@/lib/utils';
import type { ListingCondition } from '@/types/database';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    listings,
    categories,
    filters,
    isLoading,
    hasMore,
    setFilters,
    resetFilters,
    fetchListings,
    fetchCategories,
  } = useListingStore();

  const [showFilters, setShowFilters] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState({
    query: searchParams.get('q') || '',
    category_id: searchParams.get('category') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    condition: searchParams.get('condition') || '',
    location: searchParams.get('location') || '',
    sort_by: searchParams.get('sort') || 'relevance',
  });

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    // Apply filters from URL params
    const urlFilters = {
      query: searchParams.get('q') || undefined,
      category_id: searchParams.get('category') || undefined,
      min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
      max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
      condition: (searchParams.get('condition') as ListingCondition) || undefined,
      location: searchParams.get('location') || undefined,
      sort_by: (searchParams.get('sort') as typeof filters.sort_by) || 'relevance',
    };

    setFilters(urlFilters);
  }, [searchParams, setFilters]);

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (localFilters.query) params.set('q', localFilters.query);
    if (localFilters.category_id) params.set('category', localFilters.category_id);
    if (localFilters.min_price) params.set('min_price', localFilters.min_price);
    if (localFilters.max_price) params.set('max_price', localFilters.max_price);
    if (localFilters.condition) params.set('condition', localFilters.condition);
    if (localFilters.location) params.set('location', localFilters.location);
    if (localFilters.sort_by && localFilters.sort_by !== 'relevance') params.set('sort', localFilters.sort_by);

    setSearchParams(params);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setLocalFilters({
      query: '',
      category_id: '',
      min_price: '',
      max_price: '',
      condition: '',
      location: '',
      sort_by: 'relevance',
    });
    resetFilters();
    setSearchParams({});
  };

  const activeFilterCount = [
    localFilters.category_id,
    localFilters.min_price,
    localFilters.max_price,
    localFilters.condition,
    localFilters.location,
  ].filter(Boolean).length;

  const selectedCategory = categories.find(
    (c) => c.id === localFilters.category_id || c.slug === localFilters.category_id
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search listings..."
                value={localFilters.query}
                onChange={(e) => setLocalFilters({ ...localFilters, query: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center space-x-2 px-4 py-2.5 border rounded-xl font-medium transition-colors',
                showFilters || activeFilterCount > 0
                  ? 'border-red-500 bg-red-50 text-red-600'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={localFilters.sort_by}
                onChange={(e) => {
                  setLocalFilters({ ...localFilters, sort_by: e.target.value });
                  setTimeout(applyFilters, 0);
                }}
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors bg-white"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Active Filters */}
          {(localFilters.query || activeFilterCount > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {localFilters.query && (
                <span className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                  <span>Search: "{localFilters.query}"</span>
                  <button
                    onClick={() => {
                      setLocalFilters({ ...localFilters, query: '' });
                      setTimeout(applyFilters, 0);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm">
                  <span>{selectedCategory.name}</span>
                  <button
                    onClick={() => {
                      setLocalFilters({ ...localFilters, category_id: '' });
                      setTimeout(applyFilters, 0);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {(localFilters.min_price || localFilters.max_price) && (
                <span className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                  <span>
                    Price: ₱{localFilters.min_price || '0'} - ₱{localFilters.max_price || '∞'}
                  </span>
                  <button
                    onClick={() => {
                      setLocalFilters({ ...localFilters, min_price: '', max_price: '' });
                      setTimeout(applyFilters, 0);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {localFilters.condition && (
                <span className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                  <span>
                    {CONDITION_OPTIONS.find((c) => c.value === localFilters.condition)?.label}
                  </span>
                  <button
                    onClick={() => {
                      setLocalFilters({ ...localFilters, condition: '' });
                      setTimeout(applyFilters, 0);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              {localFilters.location && (
                <span className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                  <MapPin className="w-3 h-3" />
                  <span>{localFilters.location}</span>
                  <button
                    onClick={() => {
                      setLocalFilters({ ...localFilters, location: '' });
                      setTimeout(applyFilters, 0);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={localFilters.category_id}
                    onChange={(e) => setLocalFilters({ ...localFilters, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="">All Categories</option>
                    {categories
                      .filter((c) => !c.parent_id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={localFilters.min_price}
                      onChange={(e) => setLocalFilters({ ...localFilters, min_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={localFilters.max_price}
                      onChange={(e) => setLocalFilters({ ...localFilters, max_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                  <select
                    value={localFilters.condition}
                    onChange={(e) => setLocalFilters({ ...localFilters, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="">Any Condition</option>
                    {CONDITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    placeholder="Enter city"
                    value={localFilters.location}
                    onChange={(e) => setLocalFilters({ ...localFilters, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={applyFilters}
                  className="px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : `${listings.length} listings found`}
          </p>
        </div>

        {/* Listings Grid */}
        <ListingGrid
          listings={listings}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={() => fetchListings()}
          emptyMessage="No listings match your filters. Try adjusting your search criteria."
        />
      </div>
    </div>
  );
}
