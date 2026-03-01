import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useListingStore } from '@/store/listingStore';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import {
  Heart,
  Share2,
  MapPin,
  Clock,
  Eye,
  MessageCircle,
  Shield,
  Flag,
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  Truck,
  Tag,
  User,
  Calendar,
  Package,
  ExternalLink,
} from 'lucide-react';
import {
  cn,
  formatPrice,
  formatRelativeTime,
  formatDate,
  getConditionLabel,
  getConditionColor,
  getPriceTypeLabel,
} from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ListingDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentListing, fetchListingBySlug, toggleFavorite } = useListingStore();
  const { user, isAuthenticated } = useAuthStore();
  const { startConversation } = useMessageStore();
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isLiked, setIsLiked] = React.useState(false);
  const [showContactModal, setShowContactModal] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (slug) {
      setIsLoading(true);
      fetchListingBySlug(slug).finally(() => setIsLoading(false));
    }
  }, [slug, fetchListingBySlug]);

  React.useEffect(() => {
    if (currentListing) {
      setIsLiked(currentListing.is_favorited || false);
    }
  }, [currentListing]);

  const handleLike = async () => {
    if (!isAuthenticated || !user || !currentListing) {
      toast.error('Please login to save items');
      return;
    }

    setIsLiked(!isLiked);
    await toggleFavorite(currentListing.id);
    toast.success(isLiked ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: currentListing?.title,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleContact = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to contact seller');
      navigate('/login');
      return;
    }

    if (!currentListing || !currentListing.seller) return;

    if (user.id === currentListing.seller_id) {
      toast.error("You can't message yourself");
      return;
    }

    setShowContactModal(true);
  };

  const sendMessage = async () => {
    if (!currentListing || !currentListing.seller || !user) return;

    const result = await startConversation(
      currentListing.seller_id,
      currentListing.id,
      message || `Hi, I'm interested in "${currentListing.title}"`
    );

    if (result.success) {
      toast.success('Message sent!');
      navigate(`/messages/${result.conversationId}`);
    } else {
      toast.error(result.error || 'Failed to send message');
    }

    setShowContactModal(false);
    setMessage('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!currentListing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
        <p className="text-gray-600 mb-6">This listing may have been removed or doesn't exist.</p>
        <Link
          to="/browse"
          className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
        >
          Browse Listings
        </Link>
      </div>
    );
  }

  const images = currentListing.images || [];
  const seller = currentListing.seller;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link to="/browse" className="text-gray-500 hover:text-gray-700">Browse</Link>
            {currentListing.category && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <Link
                  to={`/browse?category=${currentListing.category.slug}`}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {currentListing.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium truncate max-w-[200px]">
              {currentListing.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[currentImageIndex]?.url || images[currentImageIndex]?.thumbnail_url}
                  alt={currentListing.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Package className="w-24 h-24" />
                </div>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors',
                      index === currentImageIndex ? 'border-red-500' : 'border-transparent'
                    )}
                  >
                    <img
                      src={image.thumbnail_url || image.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Listing Details */}
          <div className="space-y-6">
            {/* Price & Title */}
            <div>
              <div className="flex items-center space-x-3 mb-2">
                {currentListing.is_featured && (
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-full">
                    Featured
                  </span>
                )}
                <span className={cn('px-3 py-1 text-sm font-medium rounded-full', getConditionColor(currentListing.condition))}>
                  {getConditionLabel(currentListing.condition)}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {currentListing.title}
              </h1>

              <div className="flex items-center space-x-4 text-gray-500 text-sm">
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{currentListing.views_count} views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span>{currentListing.likes_count} likes</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Listed {formatRelativeTime(currentListing.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-red-600">
                    {currentListing.price_type === 'free'
                      ? 'FREE'
                      : formatPrice(currentListing.price, currentListing.currency)}
                  </p>
                  {currentListing.original_price && currentListing.original_price > currentListing.price && (
                    <p className="text-gray-500 line-through">
                      {formatPrice(currentListing.original_price, currentListing.currency)}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 text-gray-600">
                  <Tag className="w-5 h-5" />
                  <span>{getPriceTypeLabel(currentListing.price_type)}</span>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4">
              {currentListing.brand && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Brand</p>
                  <p className="font-medium text-gray-900">{currentListing.brand}</p>
                </div>
              )}
              {currentListing.model && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Model</p>
                  <p className="font-medium text-gray-900">{currentListing.model}</p>
                </div>
              )}
              {currentListing.location_city && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="font-medium text-gray-900 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                    {currentListing.location_city}
                  </p>
                </div>
              )}
              {currentListing.offers_shipping && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Shipping</p>
                  <p className="font-medium text-gray-900 flex items-center">
                    <Truck className="w-4 h-4 mr-1 text-green-500" />
                    {currentListing.shipping_fee
                      ? formatPrice(currentListing.shipping_fee)
                      : 'Free Shipping'}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleContact}
                className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Contact Seller</span>
              </button>
              <button
                onClick={handleLike}
                className={cn(
                  'p-3 rounded-xl border-2 transition-colors',
                  isLiked
                    ? 'border-red-500 bg-red-50 text-red-500'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                <Heart className={cn('w-6 h-6', isLiked && 'fill-current')} />
              </button>
              <button
                onClick={handleShare}
                className="p-3 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
              >
                <Share2 className="w-6 h-6" />
              </button>
            </div>

            {/* Seller Card */}
            {seller && (
              <div className="p-4 bg-white border border-gray-200 rounded-2xl">
                <div className="flex items-center space-x-4">
                  <Link to={`/profile/${seller.username}`}>
                    {seller.avatar_url ? (
                      <img
                        src={seller.avatar_url}
                        alt={seller.display_name || ''}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {seller.display_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <Link
                      to={`/profile/${seller.username}`}
                      className="font-semibold text-gray-900 hover:text-red-600 transition-colors"
                    >
                      {seller.display_name || seller.username}
                    </Link>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                      {seller.rating_count > 0 && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span>{seller.rating_average?.toFixed(1)}</span>
                          <span>({seller.rating_count})</span>
                        </div>
                      )}
                      <span>{seller.listings_count} listings</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>Joined {formatDate(seller.created_at)}</span>
                    </div>
                  </div>
                  <Link
                    to={`/profile/${seller.username}`}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Safety Tips */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="flex items-start space-x-3">
                <Shield className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Safety Tips</p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>Meet in a safe, public place</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>Check the item before you pay</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>Pay only after collecting the item</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Report */}
            <button className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors text-sm">
              <Flag className="w-4 h-4" />
              <span>Report this listing</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
          <div className="prose prose-gray max-w-none">
            <p className="whitespace-pre-wrap text-gray-700">{currentListing.description}</p>
          </div>

          {currentListing.meetup_location && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-medium text-gray-900 mb-2">Meetup Location</h3>
              <p className="text-gray-600 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                {currentListing.meetup_location}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Send Message</h2>
            <p className="text-gray-600 mb-4">
              Send a message to {seller?.display_name || 'the seller'} about this item.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi, I'm interested in "${currentListing.title}"`}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              rows={4}
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendMessage}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
