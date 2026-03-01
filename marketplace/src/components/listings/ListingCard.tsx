import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Clock, Eye, Sparkles } from 'lucide-react';
import { cn, formatPrice, formatRelativeTime, getConditionLabel, getConditionColor } from '@/lib/utils';
import type { ListingWithDetails } from '@/types/database';
import { useAuthStore } from '@/store/authStore';
import { useListingStore } from '@/store/listingStore';

interface ListingCardProps {
  listing: ListingWithDetails;
  variant?: 'default' | 'compact' | 'horizontal';
}

export default function ListingCard({ listing, variant = 'default' }: ListingCardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { toggleFavorite } = useListingStore();
  const [isLiked, setIsLiked] = React.useState(listing.is_favorited || false);
  const [likesCount, setLikesCount] = React.useState(listing.likes_count || 0);

  const primaryImage = listing.images?.find((img) => img.is_primary) || listing.images?.[0];
  const imageUrl = primaryImage?.thumbnail_url || primaryImage?.url || '/placeholder-image.jpg';

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !user) {
      // Could redirect to login
      return;
    }

    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    await toggleFavorite(listing.id);
  };

  if (variant === 'horizontal') {
    return (
      <Link
        to={`/listing/${listing.slug}`}
        className="group flex bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100"
      >
        <div className="relative w-40 h-32 flex-shrink-0">
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          {(listing.is_featured || listing.is_boosted) && (
            <div className="absolute top-2 left-2 flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>Featured</span>
            </div>
          )}
        </div>
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">
              {listing.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">
              {listing.description}
            </p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold text-red-600">
              {formatPrice(listing.price, listing.currency)}
            </span>
            <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getConditionColor(listing.condition))}>
              {getConditionLabel(listing.condition)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        to={`/listing/${listing.slug}`}
        className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100"
      >
        <div className="relative aspect-square">
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-3">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
            {listing.title}
          </h3>
          <p className="text-red-600 font-bold mt-1">
            {formatPrice(listing.price, listing.currency)}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/listing/${listing.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-2">
          {(listing.is_featured || listing.is_boosted) && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full shadow-lg">
              <Sparkles className="w-3 h-3" />
              <span>Featured</span>
            </div>
          )}
          {listing.price_type === 'negotiable' && (
            <div className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full shadow-lg">
              Negotiable
            </div>
          )}
          {listing.price_type === 'free' && (
            <div className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-lg">
              Free
            </div>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={handleLike}
          className={cn(
            'absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all',
            isLiked
              ? 'bg-red-500 text-white'
              : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
          )}
        >
          <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
        </button>

        {/* Image Count */}
        {listing.images && listing.images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
            1/{listing.images.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl font-bold text-red-600">
            {listing.price_type === 'free' ? 'FREE' : formatPrice(listing.price, listing.currency)}
          </span>
          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getConditionColor(listing.condition))}>
            {getConditionLabel(listing.condition)}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 min-h-[2.5rem]">
          {listing.title}
        </h3>

        {/* Location & Time */}
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span className="truncate max-w-[100px]">{listing.location_city || 'Location N/A'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{formatRelativeTime(listing.created_at)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{listing.views_count || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Heart className="w-4 h-4" />
            <span>{likesCount}</span>
          </div>
        </div>

        {/* Seller Info */}
        {listing.seller && (
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
            {listing.seller.avatar_url ? (
              <img
                src={listing.seller.avatar_url}
                alt={listing.seller.display_name || ''}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {listing.seller.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-sm text-gray-600 truncate">
              {listing.seller.display_name || listing.seller.username}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
