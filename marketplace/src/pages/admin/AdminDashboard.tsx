import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Package,
  MessageCircle,
  Flag,
  DollarSign,
  TrendingUp,
  Eye,
  ShieldCheck,
  Search,
  MoreVertical,
  Check,
  X,
  AlertTriangle,
  Ban,
  Trash2,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn, formatPrice, formatRelativeTime, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { User, Listing, Report } from '@/types/database';

type TabType = 'overview' | 'users' | 'listings' | 'reports' | 'categories';

interface Stats {
  totalUsers: number;
  totalListings: number;
  totalMessages: number;
  totalReports: number;
  usersChange: number;
  listingsChange: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<TabType>('overview');
  const [stats, setStats] = React.useState<Stats>({
    totalUsers: 0,
    totalListings: 0,
    totalMessages: 0,
    totalReports: 0,
    usersChange: 12,
    listingsChange: 8,
  });
  const [users, setUsers] = React.useState<User[]>([]);
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, user, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch stats
      const [usersCount, listingsCount, messagesCount, reportsCount] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        totalUsers: usersCount.count || 0,
        totalListings: listingsCount.count || 0,
        totalMessages: messagesCount.count || 0,
        totalReports: reportsCount.count || 0,
        usersChange: 12,
        listingsChange: 8,
      });

      // Fetch recent users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setUsers(usersData || []);

      // Fetch recent listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setListings(listingsData || []);

      // Fetch pending reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:users!reporter_id(id, username, display_name),
          reported_user:users!reported_user_id(id, username, display_name),
          reported_listing:listings!reported_listing_id(id, title, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      setReports(reportsData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      await supabase
        .from('users')
        .update({
          is_banned: ban,
          banned_at: ban ? new Date().toISOString() : null,
        })
        .eq('id', userId);

      toast.success(ban ? 'User banned' : 'User unbanned');
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      await supabase.from('listings').delete().eq('id', listingId);
      toast.success('Listing deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const handleSuspendListing = async (listingId: string) => {
    try {
      await supabase
        .from('listings')
        .update({ status: 'suspended' })
        .eq('id', listingId);
      toast.success('Listing suspended');
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      await supabase
        .from('reports')
        .update({
          status: action,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      toast.success(`Report ${action}`);
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, change: stats.usersChange, color: 'bg-blue-500' },
    { label: 'Total Listings', value: stats.totalListings, icon: Package, change: stats.listingsChange, color: 'bg-green-500' },
    { label: 'Messages', value: stats.totalMessages, icon: MessageCircle, color: 'bg-purple-500' },
    { label: 'Pending Reports', value: stats.totalReports, icon: Flag, color: 'bg-red-500' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'listings', label: 'Listings', icon: Package },
    { id: 'reports', label: 'Reports', icon: Flag },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-500 mt-1">Manage your marketplace</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-red-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    {stat.change !== undefined && (
                      <span className={cn(
                        'flex items-center text-sm font-medium',
                        stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {stat.change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                        {Math.abs(stat.change)}%
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mt-4">{stat.value.toLocaleString()}</p>
                  <p className="text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Users */}
              <div className="bg-white rounded-2xl shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                            {u.display_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{u.display_name || u.username}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{formatRelativeTime(u.created_at)}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                  >
                    View all users
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>

              {/* Recent Listings */}
              <div className="bg-white rounded-2xl shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Listings</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {listings.slice(0, 5).map((listing) => (
                    <div key={listing.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{listing.title}</p>
                        <p className="text-sm text-red-600 font-semibold">{formatPrice(listing.price)}</p>
                      </div>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        listing.status === 'published' ? 'bg-green-100 text-green-700' :
                        listing.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {listing.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={() => setActiveTab('listings')}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                  >
                    View all listings
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users
                    .filter((u) =>
                      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {u.display_name?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{u.display_name || u.username}</p>
                              <p className="text-sm text-gray-500">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.is_banned ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Banned</span>
                          ) : u.is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm">{formatDate(u.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/profile/${u.username}`}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {u.is_banned ? (
                              <button aria-label="Unban user"
                                onClick={() => handleBanUser(u.id, false)}
                                className="p-1 text-green-500 hover:text-green-700"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button aria-label="Ban user"
                                onClick={() => handleBanUser(u.id, true)}
                                className="p-1 text-red-500 hover:text-red-700"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">All Listings</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search listings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listing</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listings
                    .filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((listing) => (
                      <tr key={listing.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 truncate max-w-[250px]">{listing.title}</p>
                        </td>
                        <td className="px-6 py-4 text-red-600 font-semibold">{formatPrice(listing.price)}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            listing.status === 'published' ? 'bg-green-100 text-green-700' :
                            listing.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                            listing.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {listing.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{listing.views_count}</td>
                        <td className="px-6 py-4 text-gray-500 text-sm">{formatDate(listing.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/listing/${listing.slug}`}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button aria-label="Suspend listing"
                              onClick={() => handleSuspendListing(listing.id)}
                              className="p-1 text-yellow-500 hover:text-yellow-700"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                            <button aria-label="Delete listing"
                              onClick={() => handleDeleteListing(listing.id)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Pending Reports</h2>
            </div>
            {reports.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Flag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No pending reports</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reports.map((report) => (
                  <div key={report.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            report.report_type === 'spam' ? 'bg-yellow-100 text-yellow-700' :
                            report.report_type === 'scam' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {report.report_type}
                          </span>
                          <span className="text-sm text-gray-500">{formatRelativeTime(report.created_at)}</span>
                        </div>
                        <p className="text-gray-900">{report.reason}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>
                            Reported by: {(report as unknown as { reporter: { display_name: string } }).reporter?.display_name}
                          </span>
                          {report.reported_user_id && (
                            <span>
                              User: {(report as unknown as { reported_user: { display_name: string } }).reported_user?.display_name}
                            </span>
                          )}
                          {report.reported_listing_id && (
                            <Link
                              to={`/listing/${(report as unknown as { reported_listing: { slug: string } }).reported_listing?.slug}`}
                              className="text-red-600 hover:text-red-700"
                            >
                              View Listing
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleResolveReport(report.id, 'resolved')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                        >
                          <Check className="w-4 h-4" />
                          <span>Resolve</span>
                        </button>
                        <button
                          onClick={() => handleResolveReport(report.id, 'dismissed')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          <X className="w-4 h-4" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
