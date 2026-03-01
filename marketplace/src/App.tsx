import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';

// Pages
import {
  HomePage,
  BrowsePage,
  ListingDetailPage,
  CreateListingPage,
  MyListingsPage,
  MessagesPage,
  ProfilePage,
  SettingsPage,
  LoginPage,
  RegisterPage,
} from '@/pages';
import { AdminDashboard } from '@/pages/admin';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// App initialization
function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user, refreshUser, isAuthenticated } = useAuthStore();
  const { getUnreadCount } = useMessageStore();

  React.useEffect(() => {
    // Refresh user on mount
    refreshUser();
  }, [refreshUser]);

  React.useEffect(() => {
    // Get unread message count when user is authenticated
    if (isAuthenticated && user) {
      getUnreadCount();

      // Refresh every 30 seconds
      const interval = setInterval(() => {
        getUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, getUnreadCount]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppInitializer>
          <Routes>
            {/* Public routes with layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/search" element={<BrowsePage />} />
              <Route path="/listing/:slug" element={<ListingDetailPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/categories" element={<BrowsePage />} />

              {/* Auth routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
              <Route
                path="/sell"
                element={
                  <ProtectedRoute>
                    <CreateListingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sell/:id"
                element={
                  <ProtectedRoute>
                    <CreateListingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-listings"
                element={
                  <ProtectedRoute>
                    <MyListingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages/:conversationId"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <BrowsePage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Admin routes without main layout */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppInitializer>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
