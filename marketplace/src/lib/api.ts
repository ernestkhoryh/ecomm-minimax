// API Client for communicating with the backend server

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private normalizeListing(raw: any) {
    if (!raw || typeof raw !== 'object') return raw;

    const listing = { ...raw };

    if (!listing.condition && listing.item_condition) {
      listing.condition = listing.item_condition;
    }

    if (!Array.isArray(listing.images)) {
      const primaryImageUrl = listing.primary_image || listing.image_url || null;
      listing.images = primaryImageUrl
        ? [
            {
              id: `${listing.id}-primary`,
              listing_id: listing.id,
              url: primaryImageUrl,
              thumbnail_url: primaryImageUrl,
              medium_url: primaryImageUrl,
              alt_text: listing.title || null,
              sort_order: 0,
              is_primary: true,
              file_size: null,
              width: null,
              height: null,
              mime_type: null,
              created_at: listing.created_at || new Date().toISOString(),
            },
          ]
        : [];
    }

    if (!listing.category && (listing.category_id || listing.category_name || listing.category_slug)) {
      listing.category = {
        id: listing.category_id || '',
        name: listing.category_name || '',
        slug: listing.category_slug || '',
      };
    }

    if (!listing.seller && (listing.seller_id || listing.seller_username || listing.seller_display_name)) {
      listing.seller = {
        id: listing.seller_id || '',
        username: listing.seller_username || 'seller',
        display_name: listing.seller_display_name || listing.seller_username || 'Seller',
        avatar_url: listing.seller_avatar_url || null,
        rating_average: Number(listing.seller_rating_average ?? 0),
        rating_count: Number(listing.seller_rating_count ?? 0),
        listings_count: Number(listing.seller_listings_count ?? 0),
        created_at: listing.seller_created_at || listing.created_at || new Date().toISOString(),
      };
    }

    return listing;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const makeRequest = async (url: string) =>
        fetch(url, {
          ...options,
          headers,
        });

      const primaryUrl = `${this.baseUrl}${endpoint}`;
      let response = await makeRequest(primaryUrl);

      // Compatibility fallback for backends mounted at /api or /api/v1.
      if (response.status === 404) {
        const normalizedBaseUrl = this.baseUrl.replace(/\/$/, '');
        let fallbackUrl: string | null = null;

        if (normalizedBaseUrl.endsWith('/api/v1')) {
          fallbackUrl = `${normalizedBaseUrl.slice(0, -7)}/api${endpoint}`;
        } else if (normalizedBaseUrl.endsWith('/api')) {
          fallbackUrl = `${normalizedBaseUrl}/v1${endpoint}`;
        }

        if (fallbackUrl) {
          response = await makeRequest(fallbackUrl);
        }
      }

      const payload = await response.json();

      if (!response.ok) {
        return { error: payload?.error || payload?.message || 'An error occurred' };
      }

      // Normalize backend envelope shapes.
      if (payload && typeof payload === 'object' && 'data' in payload) {
        return { data: payload.data as T };
      }

      return { data: payload as T };
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  }

  // Auth endpoints
  async register(email: string, password: string, username: string, displayName?: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, displayName }),
    });
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async googleLogin(idToken: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    return result;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  async resetPassword(email: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Listings endpoints
  async getListings(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    city?: string;
    sort?: string;
    order?: string;
  } = {}) {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) queryParams.append('page', String(params.page));
    if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
    if (params.search) queryParams.append('q', params.search);
    if (params.category) queryParams.append('categoryId', params.category);
    if (params.min_price !== undefined) queryParams.append('minPrice', String(params.min_price));
    if (params.max_price !== undefined) queryParams.append('maxPrice', String(params.max_price));

    const result = await this.request<any[]>(`/listings?${queryParams.toString()}`);
    if (result.error) return { error: result.error };

    const listings = Array.isArray(result.data) ? result.data.map((item) => this.normalizeListing(item)) : [];
    return { data: { listings, pagination: { page: params.page || 1, limit: params.limit || listings.length } } };
  }

  async getFeaturedListings() {
    const result = await this.getListings({ page: 1, limit: 8 });
    if (result.error) return { error: result.error };

    const listings = (result.data?.listings || []).filter((item: any) => item.is_featured);
    return { data: { listings } };
  }

  async getListing(id: string) {
    const result = await this.request<any>(`/listings/${id}`);
    if (result.error) return { error: result.error };

    return { data: { listing: this.normalizeListing(result.data), is_liked: false } };
  }

  async getListingBySlug(slug: string) {
    const result = await this.request<any>(`/listings/slug/${encodeURIComponent(slug)}`);
    if (result.error) return { error: result.error };

    return { data: { listing: this.normalizeListing(result.data), is_liked: false } };
  }

  async getMyListings(params: { page?: number; limit?: number; status?: string } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const suffix = queryParams.toString() ? `?${queryParams}` : '';
    const result = await this.request<any[]>(`/listings/mine${suffix}`);
    if (result.error) return { error: result.error };

    const listings = Array.isArray(result.data) ? result.data.map((item) => this.normalizeListing(item)) : [];
    return { data: { listings, pagination: { page: 1, limit: listings.length } } };
  }

  async createListing(listing: {
    title: string;
    description: string;
    price: number;
    price_type?: string;
    currency?: string;
    original_price?: number;
    condition?: string;
    brand?: string;
    model?: string;
    location_city?: string;
    location_state?: string;
    location_country?: string;
    meetup_location?: string;
    category_id?: string;
    offers_shipping?: boolean;
    shipping_fee?: number;
    shipping_details?: string;
  }) {
    return this.request<{ listing: any }>('/listings', {
      method: 'POST',
      body: JSON.stringify({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        categoryId: listing.category_id,
        priceType: listing.price_type,
        itemCondition: listing.condition,
        brand: listing.brand,
        model: listing.model,
        locationCity: listing.location_city,
        locationState: listing.location_state,
        locationCountry: listing.location_country,
        meetupLocation: listing.meetup_location,
        offersShipping: listing.offers_shipping,
        shippingFee: listing.shipping_fee,
        shippingDetails: listing.shipping_details,
      }),
    });
  }

  async updateListing(id: string, updates: Partial<any>) {
    return this.request<{ listing: any }>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteListing(id: string) {
    return this.request<{ message: string }>(`/listings/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadListingImages(listingId: string, imageUrls: string[]) {
    return this.request<{ images: any[] }>(`/listings/${listingId}/images`, {
      method: 'POST',
      body: JSON.stringify({ imageUrls }),
    });
  }

  async deleteListingImage(listingId: string, imageId: string) {
    return this.request<{ message: string }>(`/listings/${listingId}/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  async likeListing(id: string) {
    return this.request<{ liked: boolean }>(`/listings/${id}/like`, {
      method: 'POST',
    });
  }

  async getSimilarListings(id: string, limit = 4) {
    return this.request<{ listings: any[] }>(`/listings/${id}/similar?limit=${limit}`);
  }

  // Messages endpoints
  async getConversations(params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    return this.request<{ conversations: any[] }>(`/messages/conversations?${queryParams}`);
  }

  async getConversation(id: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    return this.request<{ conversation: any; messages: any[] }>(`/messages/conversations/${id}?${queryParams}`);
  }

  async createConversation(data: { listing_id: string; seller_id: string; initial_message?: string }) {
    return this.request<{ conversation: any; message?: any }>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendMessage(conversationId: string, data: { content: string; attachment_url?: string; attachment_type?: string }) {
    return this.request<{ message: any }>(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteConversation(id: string) {
    return this.request<{ message: string }>(`/messages/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  async getUnreadCount() {
    return this.request<{ unread_count: number }>('/messages/conversations/unread/count');
  }

  // Users endpoints
  async getMyProfile() {
    return this.request<{ user: any }>('/users/me');
  }

  async updateMyProfile(data: {
    display_name?: string;
    bio?: string;
    phone?: string;
    location_city?: string;
    location_state?: string;
    location_country?: string;
    location_lat?: number;
    location_lng?: number;
  }) {
    return this.request<{ user: any }>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateAvatar(avatarUrl: string) {
    return this.request<{ user: any }>('/users/me/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
  }

  async getUser(id: string) {
    return this.request<{ user: any; listings: any[] }>(`/users/${id}`);
  }

  async getUserListings(id: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    return this.request<{ listings: any[]; pagination: any }>(`/users/${id}/listings?${queryParams}`);
  }

  async followUser(id: string) {
    return this.request<{ following: boolean }>(`/users/${id}/follow`, {
      method: 'POST',
    });
  }

  async getFollowers(id: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    return this.request<{ followers: any[]; pagination: any }>(`/users/${id}/followers?${queryParams}`);
  }

  async getFollowing(id: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    return this.request<{ following: any[]; pagination: any }>(`/users/${id}/following?${queryParams}`);
  }

  async getUserReviews(id: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    return this.request<{ reviews: any[]; pagination: any }>(`/users/${id}/reviews?${queryParams}`);
  }

  async createReview(userId: string, data: { rating: number; title?: string; content?: string; listing_id?: string }) {
    return this.request<{ review: any }>(`/users/${userId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
