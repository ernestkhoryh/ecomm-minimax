import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ListingGrid } from '@/components/listings';
import {
  MapPin,
  Calendar,
  Star,
  Settings,
  Share2,
  UserPlus,
  UserMinus,
  Package,
  ShoppingBag,
  MessageCircle,
  Flag,
  Check,
  ExternalLink,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { UserProfile, ListingWithDetails, ReviewWithDetails } from '@/types/database';

type TabType = 'listings' | 'reviews' | 'about';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [listings, setListings] = React.useState<ListingWithDetails[]>([]);
  const [reviews, setReviews] = React.useState<ReviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabType>('listings');

  const isOwnProfile = currentUser?.username === username;

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;

      setIsLoading(true);
      try {
        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();

        if (userError) throw userError;
        setProfile(userData);

        // Fetch user listings
        const { data: listingsData } = await supabase
          .from('listings')
          .select(`
            *,
            category:categories!category_id(id, name, slug, icon),
            images:listing_images(id, url, thumbnail_url, is_primary, sort_order)
          `)
          .eq('seller_id', userData.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        setListings(listingsData || []);

        // Fetch user reviews
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select(`
            *,
            reviewer:users!reviewer_id(id, username, display_name, avatar_url)
          `)
          .eq('reviewed_user_id', userData.id)
          .eq('is_visible', true)
          .order('created_at', { ascending: false });

        setReviews(reviewsData || []);

        // Check if following
        if (currentUser && currentUser.id !== userData.id) {
          const { data: followData } = await supabase
            .from('user_follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userData.id)
            .single();

          setIsFollowing(!!followData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username, currentUser]);

  const handleFollow = async () => {
    if (!isAuthenticated || !currentUser || !profile) {
      toast.error('Please login to follow users');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);
        setIsFollowing(false);
        toast.success('Unfollowed successfully');
      } else {
        await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profile.id,
          });
        setIsFollowing(true);
        toast.success('Following!');
      }
    } catch (error) {
      console.error('Error following:', error);
      toast.error('Something went wrong');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${profile?.display_name}'s Profile`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
        <Link
          to="/"
          className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || ''}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                {profile.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {profile.display_name || profile.username}
                </h1>
                {profile.id_verified && (
                  <span className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    <Check className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              <p className="text-gray-500 mb-3">@{profile.username}</p>

              {profile.bio && (
                <p className="text-gray-700 mb-4 max-w-xl">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {profile.rating_count > 0 && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{profile.rating_average?.toFixed(1)}</span>
                    <span className="text-gray-500">({profile.rating_count} reviews)</span>
                  </div>
                )}
                <div className="flex items-center space-x-1 text-gray-500">
                  <Package className="w-4 h-4" />
                  <span>{profile.listings_count} listings</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-500">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{profile.sales_count} sold</span>
                </div>
                {profile.location_city && (
                  <div className="flex items-center space-x-1 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location_city}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1 text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {isOwnProfile ? (
                <Link
                  to="/settings"
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>Edit Profile</span>
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleFollow}
                    className={cn(
                      'flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-colors',
                      isFollowing
                        ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    )}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="w-5 h-5" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                  <Link
                    to={`/messages/new?seller=${profile.id}`}
                    className="p-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Link>
                </>
              )}
              <button
                onClick={handleShare}
                className="p-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex space-x-8 border-b border-transparent">
            {[
              { id: 'listings', label: 'Listings', count: listings.length },
              { id: 'reviews', label: 'Reviews', count: reviews.length },
              { id: 'about', label: 'About' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  'flex items-center space-x-2 py-4 border-b-2 font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded-full',
                    activeTab === tab.id ? 'bg-red-100' : 'bg-gray-100'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'listings' && (
          <ListingGrid
            listings={listings}
            columns={3}
            emptyMessage={
              isOwnProfile
                ? "You haven't listed any items yet"
                : `${profile.display_name} hasn't listed any items yet`
            }
          />
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No reviews yet
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-start space-x-4">
                    <Link to={`/profile/${review.reviewer?.username}`}>
                      {review.reviewer?.avatar_url ? (
                        <img
                          src={review.reviewer.avatar_url}
                          alt={review.reviewer.display_name || ''}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                          {review.reviewer?.display_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            to={`/profile/${review.reviewer?.username}`}
                            className="font-semibold text-gray-900 hover:text-red-600"
                          >
                            {review.reviewer?.display_name || review.reviewer?.username}
                          </Link>
                          <div className="flex items-center space-x-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  'w-4 h-4',
                                  star <= review.rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                      {review.title && (
                        <p className="font-medium text-gray-900 mt-2">{review.title}</p>
                      )}
                      {review.content && (
                        <p className="text-gray-700 mt-1">{review.content}</p>
                      )}
                      {review.is_verified && (
                        <span className="inline-flex items-center space-x-1 mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <Check className="w-3 h-3" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>

            <div className="space-y-4">
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Bio</h3>
                  <p className="text-gray-700">{profile.bio}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Member Since</h3>
                <p className="text-gray-700">{formatDate(profile.created_at)}</p>
              </div>

              {profile.location_city && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                  <p className="text-gray-700 flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                    {profile.location_city}
                    {profile.location_country && `, ${profile.location_country}`}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Verification</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Check className={cn(
                      'w-4 h-4',
                      profile.email_verified ? 'text-green-500' : 'text-gray-300'
                    )} />
                    <span className={profile.email_verified ? 'text-gray-700' : 'text-gray-400'}>
                      Email verified
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className={cn(
                      'w-4 h-4',
                      profile.phone_verified ? 'text-green-500' : 'text-gray-300'
                    )} />
                    <span className={profile.phone_verified ? 'text-gray-700' : 'text-gray-400'}>
                      Phone verified
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className={cn(
                      'w-4 h-4',
                      profile.id_verified ? 'text-green-500' : 'text-gray-300'
                    )} />
                    <span className={profile.id_verified ? 'text-gray-700' : 'text-gray-400'}>
                      ID verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {!isOwnProfile && (
              <button className="flex items-center space-x-2 mt-6 text-gray-500 hover:text-red-500 transition-colors text-sm">
                <Flag className="w-4 h-4" />
                <span>Report this user</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
