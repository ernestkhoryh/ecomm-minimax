import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import {
  Search,
  Plus,
  MessageCircle,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  Package,
  Heart,
  ChevronDown,
  Store,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount } = useMessageStore();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsProfileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">MarketHub</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
          </form>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                {/* Sell Button */}
                <Link
                  to="/sell"
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span>Sell</span>
                </Link>

                {/* Messages */}
                <Link
                  to="/messages"
                  className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <MessageCircle className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <button className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                  <Bell className="w-6 h-6" />
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name || 'Profile'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {user?.display_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', isProfileOpen && 'rotate-180')} />
                  </button>

                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-semibold text-gray-900">{user?.display_name}</p>
                          <p className="text-sm text-gray-500">@{user?.username}</p>
                        </div>

                        <div className="py-2">
                          <Link
                            to={`/profile/${user?.username}`}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <User className="w-5 h-5" />
                            <span>View Profile</span>
                          </Link>
                          <Link
                            to="/my-listings"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Package className="w-5 h-5" />
                            <span>My Listings</span>
                          </Link>
                          <Link
                            to="/favorites"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Heart className="w-5 h-5" />
                            <span>Favorites</span>
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center space-x-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Settings className="w-5 h-5" />
                            <span>Settings</span>
                          </Link>
                          {(user?.role === 'admin' || user?.role === 'super_admin') && (
                            <Link
                              to="/admin"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center space-x-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Shield className="w-5 h-5" />
                              <span>Admin Dashboard</span>
                            </Link>
                          )}
                        </div>

                        <div className="border-t border-gray-100 pt-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 px-4 py-2.5 w-full text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-5 h-5" />
                            <span>Log Out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-red-500/20 transition-all"
            />
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3 px-3 py-3 border-b border-gray-100 mb-2">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name || 'Profile'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{user?.display_name}</p>
                    <p className="text-sm text-gray-500">@{user?.username}</p>
                  </div>
                </div>

                <Link
                  to="/sell"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Sell Something</span>
                </Link>
                <Link
                  to="/messages"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-5 h-5" />
                    <span>Messages</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to={`/profile/${user?.username}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/my-listings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <Package className="w-5 h-5" />
                  <span>My Listings</span>
                </Link>
                <Link
                  to="/favorites"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <Heart className="w-5 h-5" />
                  <span>Favorites</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </Link>
                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-3 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-center text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-center text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
