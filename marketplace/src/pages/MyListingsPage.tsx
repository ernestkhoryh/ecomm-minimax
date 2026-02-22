import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useListingStore } from '@/store/listingStore';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  MoreVertical,
  Package,
  AlertCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cn, formatPrice, formatRelativeTime, getStatusLabel, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ListingWithDetails } from '@/types/database';

export default function MyListingsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { userListings, fetchUserListings, deleteListing, updateListing, isLoading } = useListingStore();
  const [activeTab, setActiveTab] = React.useState<'all' | 'published' | 'draft' | 'sold'>('all');
  const [showMenu, setShowMenu] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchUserListings(user.id);
    }
  }, [isAuthenticated, user, navigate, fetchUserListings]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    const result = await deleteListing(id);
    if (result.success) {
      toast.success('Listing deleted');
    } else {
      toast.error(result.error || 'Failed to delete');
    }
    setShowMenu(null);
  };

  const handleMarkAsSold = async (listing: ListingWithDetails) => {
    const result = await updateListing(listing.id, { status: 'sold' });
    if (result.success) {
      toast.success('Marked as sold!');
      if (user) fetchUserListings(user.id);
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setShowMenu(null);
  };

  const filteredListings = userListings.filter((listing) => {
    if (activeTab === 'all') return true;
    return listing.status === activeTab;
  });

  const stats = {
    total: userListings.length,
    published: userListings.filter((l) => l.status === 'published').length,
    draft: userListings.filter((l) => l.status === 'draft').length,
    sold: userListings.filter((l) => l.status === 'sold').length,
    totalViews: userListings.reduce((sum, l) => sum + (l.views_count || 0), 0),
    totalLikes: userListings.reduce((sum, l) => sum + (l.likes_count || 0), 0),
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-500 mt-1">Manage your items for sale</p>
          </div>
          <Link
            to="/sell"
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-orange-600 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>New Listing</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.sold}</p>
                <p className="text-sm text-gray-500">Sold</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
                <p className="text-sm text-gray-500">Total Views</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLikes}</p>
                <p className="text-sm text-gray-500">Total Likes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-white rounded-xl p-1 shadow-sm">
          {[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'published', label: 'Published', count: stats.published },
            { id: 'draft', label: 'Drafts', count: stats.draft },
            { id: 'sold', label: 'Sold', count: stats.sold },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-red-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h2>
            <p className="text-gray-500 mb-6">
              {activeTab === 'all'
                ? "You haven't created any listings yet"
                : `No ${activeTab} listings`}
            </p>
            <Link
              to="/sell"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Listing</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((listing) => {
              const primaryImage = listing.images?.find((img) => img.is_primary) || listing.images?.[0];

              return (
                <div
                  key={listing.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center p-4">
                    {/* Image */}
                    <Link to={`/listing/${listing.slug}`} className="flex-shrink-0">
                      {primaryImage ? (
                        <img
                          src={primaryImage.thumbnail_url || primaryImage.url}
                          alt={listing.title}
                          className="w-24 h-24 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0 ml-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            to={`/listing/${listing.slug}`}
                            className="font-semibold text-gray-900 hover:text-red-600 transition-colors line-clamp-1"
                          >
                            {listing.title}
                          </Link>
                          <p className="text-lg font-bold text-red-600 mt-1">
                            {formatPrice(listing.price, listing.currency)}
                          </p>
                        </div>
                        <span className={cn('px-3 py-1 text-xs font-medium rounded-full', getStatusColor(listing.status))}>
                          {getStatusLabel(listing.status)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{listing.views_count} views</span>
                        </span>
                        <span>{listing.likes_count} likes</span>
                        <span>{formatRelativeTime(listing.created_at)}</span>
                      </div>

                      {listing.status === 'draft' && (
                        <div className="flex items-center space-x-1 mt-2 text-amber-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span>Draft - not visible to buyers</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        to={`/listing/${listing.slug}`}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <Link
                        to={`/sell/${listing.id}`}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-5 h-5" />
                      </Link>

                      {/* More Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(showMenu === listing.id ? null : listing.id)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {showMenu === listing.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowMenu(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                              {listing.status === 'published' && (
                                <button
                                  onClick={() => handleMarkAsSold(listing)}
                                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  Mark as Sold
                                </button>
                              )}
                              {listing.status === 'draft' && (
                                <button
                                  onClick={() => {
                                    updateListing(listing.id, { status: 'published' });
                                    if (user) fetchUserListings(user.id);
                                    setShowMenu(null);
                                    toast.success('Listing published!');
                                  }}
                                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  Publish
                                </button>
                              )}
                              <Link
                                to={`/boost/${listing.id}`}
                                className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                Boost Listing
                              </Link>
                              <hr className="my-1" />
                              <button
                                onClick={() => handleDelete(listing.id)}
                                className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
