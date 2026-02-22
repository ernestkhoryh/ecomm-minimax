import { Link } from 'react-router-dom';
import {
  Store,
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

const footerLinks = {
  marketplace: [
    { name: 'Browse All', href: '/browse' },
    { name: 'Categories', href: '/categories' },
    { name: 'Trending', href: '/trending' },
    { name: 'New Arrivals', href: '/new' },
  ],
  seller: [
    { name: 'Start Selling', href: '/sell' },
    { name: 'Seller Guide', href: '/seller-guide' },
    { name: 'Boost Your Listing', href: '/boost' },
    { name: 'Pro Seller Plans', href: '/pro' },
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'Safety Tips', href: '/safety' },
    { name: 'Report an Issue', href: '/report' },
    { name: 'Contact Us', href: '/contact' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
    { name: 'Blog', href: '/blog' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">MarketHub</span>
            </Link>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Your trusted peer-to-peer marketplace for buying and selling anything. Safe, simple, and social.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>support@markethub.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>+63 2 1234 5678</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>Manila, Philippines</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4 mt-6">
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Marketplace</h4>
            <ul className="space-y-2">
              {footerLinks.marketplace.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Sell</h4>
            <ul className="space-y-2">
              {footerLinks.seller.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} MarketHub. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm">
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/cookies" className="hover:text-white transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
