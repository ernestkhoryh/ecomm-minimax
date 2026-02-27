// API Client for communicating with the backend server

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'An error occurred' };
      }

      return { data };
    } catch (error) {
      return { error: 'Network error. Please try again.' };
    }
  }

  // Auth endpoints
  async register(email: string, password: string, username: string, displayName?: string) {
    const result = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, display_name: displayName }),
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
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    return this.request<{ listings: any[]; pagination: any }>(`/listings?${queryParams}`);
  }

  async getFeaturedListings() {
    return this.request<{ listings: any[] }>('/listings/featured');
  }

  async getListing(id: string) {
    return this.request<{ listing: any; is_liked: boolean }>(`/listings/${id}`);
  }

  async getMyListings(params: { page?: number; limit?: number; status?: string } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    return this.request<{ listings: any[]; pagination: any }>(`/listings/my-listings?${queryParams}`);
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
      body: JSON.stringify(listing),
    });
  }

  async updateListing(id: string, updates: Partial<any>) {
    return this.request<{ listing: any }>(`/listings/${id}`, {
      method: 'PUT',
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
