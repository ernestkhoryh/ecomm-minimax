import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const location = useLocation();

  // Pages that should not have footer (e.g., messaging, admin)
  const noFooterPages = ['/messages', '/admin'];
  const showFooter = !noFooterPages.some((page) => location.pathname.startsWith(page));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
