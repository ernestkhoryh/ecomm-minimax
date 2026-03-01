import { create } from 'zustand';
import api from '@/lib/api';
import { useAuthStore } from './authStore';
import type { Listing, ListingWithDetails, Category, ListingCondition, PriceType, ListingStatus } from '@/types/database';

interface ListingFilters {
  query?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  condition?: ListingCondition;
  location?: string;
  sort_by?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'relevance';
}

interface ListingState {
  listings: ListingWithDetails[];
  featuredListings: ListingWithDetails[];
  userListings: ListingWithDetails[];
  currentListing: ListingWithDetails | null;
  categories: Category[];
  filters: ListingFilters;
  isLoading: boolean;
  hasMore: boolean;
  page: number;

  // Actions
  fetchListings: (reset?: boolean) => Promise<void>;
  fetchFeaturedListings: () => Promise<void>;
  fetchUserListings: (userId: string) => Promise<void>;
  fetchListingById: (id: string) => Promise<ListingWithDetails | null>;
  fetchListingBySlug: (slug: string) => Promise<ListingWithDetails | null>;
  fetchCategories: () => Promise<void>;
  createListing: (data: CreateListingData) => Promise<{ success: boolean; listing?: Listing; error?: string }>;
  updateListing: (id: string, data: Partial<CreateListingData>) => Promise<{ success: boolean; error?: string }>;
  deleteListing: (id: string) => Promise<{ success: boolean; error?: string }>;
  setFilters: (filters: ListingFilters) => void;
  resetFilters: () => void;
  toggleFavorite: (listingId: string) => Promise<void>;
}

interface CreateListingData {
  title: string;
  description: string;
  price: number;
  price_type?: PriceType;
  condition?: ListingCondition;
  category_id: string;
  brand?: string;
  model?: string;
  location_city?: string;
  location_state?: string;
  location_country?: string;
  meetup_location?: string;
  offers_shipping?: boolean;
  shipping_fee?: number;
  shipping_details?: string;
  status?: ListingStatus;
  images?: string[];
}

const PAGE_SIZE = 20;

export const useListingStore = create<ListingState>((set, get) => ({
  listings: [],
  featuredListings: [],
  userListings: [],
  currentListing: null,
  categories: [],
  filters: {},
  isLoading: false,
  hasMore: true,
  page: 0,

  setFilters: (filters) => {
    set({ filters, page: 0, listings: [], hasMore: true });
    get().fetchListings(true);
  },

  resetFilters: () => {
    set({ filters: {}, page: 0, listings: [], hasMore: true });
    get().fetchListings(true);
  },

  fetchListings: async (reset = false) => {
    const { filters, page, isLoading, hasMore } = get();

    if (isLoading || (!reset && !hasMore)) return;

    set({ isLoading: true });

    const currentPage = reset ? 0 : page;

    try {
      // Map sort_by to API format
      let sort = 'created_at';
      let order = 'desc';
      switch (filters.sort_by) {
        case 'newest':
          sort = 'created_at';
          order = 'desc';
          break;
        case 'oldest':
          sort = 'created_at';
          order = 'asc';
          break;
        case 'price_low':
          sort = 'price';
          order = 'asc';
          break;
        case 'price_high':
          sort = 'price';
          order = 'desc';
          break;
      }

      const result = await api.getListings({
        page: currentPage + 1,
        limit: PAGE_SIZE,
        search: filters.query,
        category: filters.category_id,
        min_price: filters.min_price,
        max_price: filters.max_price,
        condition: filters.condition,
        city: filters.location,
        sort,
        order,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const newListings = result.data?.listings || [];

      set({
        listings: reset ? newListings : [...get().listings, ...newListings],
        page: currentPage + 1,
        hasMore: newListings.length === PAGE_SIZE,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching listings:', error);
      set({ isLoading: false });
    }
  },

  fetchFeaturedListings: async () => {
    try {
      const result = await api.getFeaturedListings();

      if (result.error) {
        throw new Error(result.error);
      }

      set({ featuredListings: result.data?.listings || [] });
    } catch (error) {
      console.error('Error fetching featured listings:', error);
    }
  },

  fetchUserListings: async (userId: string) => {
    set({ isLoading: true });
    try {
      const result = await api.getMyListings({});

      if (result.error) {
        throw new Error(result.error);
      }

      set({ userListings: result.data?.listings || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching user listings:', error);
      set({ isLoading: false });
    }
  },

  fetchListingById: async (id: string) => {
    try {
      const result = await api.getListing(id);

      if (result.error) {
        throw new Error(result.error);
      }

      set({ currentListing: result.data?.listing });
      return result.data?.listing || null;
    } catch (error) {
      console.error('Error fetching listing:', error);
      return null;
    }
  },

  fetchListingBySlug: async (slug: string) => {
    try {
      // API uses ID, so we need to fetch by ID from listings endpoint
      const result = await api.getListings({ search: slug, limit: 1 });
      const listing = result.data?.listings?.[0];

      if (listing) {
        set({ currentListing: listing });
        return listing;
      }
      return null;
    } catch (error) {
      console.error('Error fetching listing:', error);
      return null;
    }
  },

  fetchCategories: async () => {
    // Categories are fetched through listings response or could be added to API
    // For now, we'll use a simple approach
    try {
      const result = await api.getListings({ limit: 1 });
      // Categories would be included in listing responses
      // This is a placeholder - in production, add a categories endpoint
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  },

  createListing: async (data: CreateListingData) => {
    try {
      const result = await api.createListing({
        title: data.title,
        description: data.description,
        price: data.price,
        price_type: data.price_type || 'fixed',
        condition: data.condition || 'good',
        category_id: data.category_id,
        brand: data.brand,
        model: data.model,
        location_city: data.location_city,
        location_state: data.location_state,
        location_country: data.location_country,
        meetup_location: data.meetup_location,
        offers_shipping: data.offers_shipping,
        shipping_fee: data.shipping_fee,
        shipping_details: data.shipping_details,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Upload images if provided
      if (data.images && data.images.length > 0 && result.data?.listing) {
        await api.uploadListingImages(result.data.listing.id, data.images);
      }

      return { success: true, listing: result.data?.listing };
    } catch (error) {
      console.error('Error creating listing:', error);
      return { success: false, error: 'Failed to create listing' };
    }
  },

  updateListing: async (id: string, data: Partial<CreateListingData>) => {
    try {
      const result = await api.updateListing(id, data);

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating listing:', error);
      return { success: false, error: 'Failed to update listing' };
    }
  },

  deleteListing: async (id: string) => {
    try {
      const result = await api.deleteListing(id);

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Remove from local state
      set({
        listings: get().listings.filter((l) => l.id !== id),
        userListings: get().userListings.filter((l) => l.id !== id),
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting listing:', error);
      return { success: false, error: 'Failed to delete listing' };
    }
  },

  toggleFavorite: async (listingId: string) => {
    try {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) return;

      const result = await api.likeListing(listingId);

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state
      const updateListings = (listings: ListingWithDetails[]) =>
        listings.map((l) =>
          l.id === listingId
            ? { ...l, is_favorited: result.data?.liked, likes_count: l.likes_count + (result.data?.liked ? 1 : -1) }
            : l
        );

      set({
        listings: updateListings(get().listings),
        featuredListings: updateListings(get().featuredListings),
        currentListing: get().currentListing?.id === listingId
          ? { ...get().currentListing!, is_favorited: result.data?.liked, likes_count: get().currentListing!.likes_count + (result.data?.liked ? 1 : -1) }
          : get().currentListing,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  },
}));

export default useListingStore;
