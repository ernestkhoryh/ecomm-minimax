import React from 'react';
import { Link } from 'react-router-dom';
import { useListingStore } from '@/store/listingStore';
import { ListingGrid } from '@/components/listings';
import {
  Search,
  ArrowRight,
  Sparkles,
  Shield,
  MessageCircle,
  Zap,
  ChevronRight,
  Laptop,
  Smartphone,
  Car,
  Home,
  Shirt,
  Dumbbell,
  Gamepad2,
  Book,
} from 'lucide-react';

const categories = [
  { name: 'Electronics', icon: Laptop, slug: 'electronics', color: 'bg-blue-500' },
  { name: 'Phones', icon: Smartphone, slug: 'mobile-phones', color: 'bg-purple-500' },
  { name: 'Vehicles', icon: Car, slug: 'vehicles', color: 'bg-green-500' },
  { name: 'Property', icon: Home, slug: 'property', color: 'bg-yellow-500' },
  { name: 'Fashion', icon: Shirt, slug: 'fashion', color: 'bg-pink-500' },
  { name: 'Sports', icon: Dumbbell, slug: 'sports', color: 'bg-red-500' },
  { name: 'Gaming', icon: Gamepad2, slug: 'gaming', color: 'bg-indigo-500' },
  { name: 'Books', icon: Book, slug: 'books-media', color: 'bg-orange-500' },
];

const features = [
  {
    icon: Shield,
    title: 'Safe & Secure',
    description: 'Verified users and secure transactions keep you protected',
  },
  {
    icon: MessageCircle,
    title: 'Easy Communication',
    description: 'Chat directly with sellers and buyers in real-time',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'List items in seconds and find what you need instantly',
  },
];

export default function HomePage() {
  const { listings, featuredListings, isLoading, fetchListings, fetchFeaturedListings, fetchCategories } = useListingStore();
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    fetchFeaturedListings();
    fetchListings(true);
    fetchCategories();
  }, [fetchFeaturedListings, fetchListings, fetchCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 py-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Buy & Sell Anything
              <br />
              <span className="text-white/90">Near You</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join millions of people buying and selling from each other everyday in your local community
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-32 py-4 text-lg rounded-2xl shadow-xl focus:ring-4 focus:ring-white/30 focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Links */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {['iPhone', 'Laptop', 'Sneakers', 'PS5', 'Bike'].map((term) => (
                <Link
                  key={term}
                  to={`/search?q=${term}`}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm font-medium transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Browse Categories</h2>
            <Link
              to="/categories"
              className="flex items-center text-red-600 hover:text-red-700 font-medium"
            >
              View All
              <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/browse?category=${category.slug}`}
                className="flex flex-col items-center p-4 rounded-2xl hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-14 h-14 ${category.color} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                  <category.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {featuredListings.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Featured Listings</h2>
              </div>
              <Link
                to="/browse?featured=true"
                className="flex items-center text-red-600 hover:text-red-700 font-medium"
              >
                View All
                <ArrowRight className="w-5 h-5 ml-1" />
              </Link>
            </div>

            <ListingGrid listings={featuredListings} columns={4} />
          </div>
        </section>
      )}

      {/* Recent Listings */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Latest Listings</h2>
            <Link
              to="/browse"
              className="flex items-center text-red-600 hover:text-red-700 font-medium"
            >
              Browse All
              <ArrowRight className="w-5 h-5 ml-1" />
            </Link>
          </div>

          <ListingGrid
            listings={listings.slice(0, 12)}
            isLoading={isLoading}
            columns={4}
          />

          {listings.length > 0 && (
            <div className="text-center mt-8">
              <Link
                to="/browse"
                className="inline-flex items-center px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                View More Listings
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose MarketHub?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              The easiest and safest way to buy and sell in your local community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="text-center p-6 rounded-2xl bg-gray-800/50"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-red-500 to-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Selling?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            List your first item in under 30 seconds. It's free and easy!
          </p>
          <Link
            to="/sell"
            className="inline-flex items-center px-8 py-4 bg-white text-red-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl"
          >
            Start Selling Now
            <ArrowRight className="w-6 h-6 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
