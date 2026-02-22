import React from 'react';
import ListingCard from './ListingCard';
import type { ListingWithDetails } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ListingGridProps {
  listings: ListingWithDetails[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
  columns?: 2 | 3 | 4;
}

export default function ListingGrid({
  listings,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  emptyMessage = 'No listings found',
  columns = 4,
}: ListingGridProps) {
  const observerRef = React.useRef<HTMLDivElement>(null);

  // Infinite scroll with Intersection Observer
  React.useEffect(() => {
    if (!hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  if (!isLoading && listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && <div ref={observerRef} className="h-4" />}
    </div>
  );
}
