// Database types for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'user' | 'seller' | 'admin' | 'super_admin';
export type ListingStatus = 'draft' | 'published' | 'sold' | 'archived' | 'suspended';
export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type PriceType = 'fixed' | 'negotiable' | 'free';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportType = 'spam' | 'inappropriate' | 'scam' | 'counterfeit' | 'other';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'disputed';
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type BoostType = 'featured' | 'highlight' | 'urgent' | 'top';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          email_verified: boolean;
          password_hash: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          phone: string | null;
          phone_verified: boolean;
          location_city: string | null;
          location_state: string | null;
          location_country: string;
          location_lat: number | null;
          location_lng: number | null;
          role: UserRole;
          is_active: boolean;
          is_banned: boolean;
          ban_reason: string | null;
          banned_at: string | null;
          id_verified: boolean;
          verified_at: string | null;
          subscription_tier: SubscriptionTier;
          subscription_expires_at: string | null;
          listings_count: number;
          sales_count: number;
          rating_average: number;
          rating_count: number;
          followers_count: number;
          following_count: number;
          google_id: string | null;
          facebook_id: string | null;
          last_login_at: string | null;
          last_login_ip: string | null;
          failed_login_attempts: number;
          locked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at' | 'listings_count' | 'sales_count' | 'rating_average' | 'rating_count' | 'followers_count' | 'following_count'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          image_url: string | null;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          meta_title: string | null;
          meta_description: string | null;
          listings_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at' | 'listings_count'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string | null;
          title: string;
          slug: string;
          description: string;
          price: number;
          price_type: PriceType;
          currency: string;
          original_price: number | null;
          condition: ListingCondition;
          brand: string | null;
          model: string | null;
          location_city: string | null;
          location_state: string | null;
          location_country: string | null;
          location_lat: number | null;
          location_lng: number | null;
          meetup_location: string | null;
          status: ListingStatus;
          is_featured: boolean;
          is_boosted: boolean;
          boost_expires_at: string | null;
          boost_type: BoostType | null;
          views_count: number;
          likes_count: number;
          shares_count: number;
          messages_count: number;
          offers_shipping: boolean;
          shipping_fee: number | null;
          shipping_details: string | null;
          is_approved: boolean;
          moderation_notes: string | null;
          moderated_by: string | null;
          moderated_at: string | null;
          meta_title: string | null;
          meta_description: string | null;
          published_at: string | null;
          sold_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['listings']['Row'], 'id' | 'created_at' | 'updated_at' | 'views_count' | 'likes_count' | 'shares_count' | 'messages_count'>;
        Update: Partial<Database['public']['Tables']['listings']['Insert']>;
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          url: string;
          thumbnail_url: string | null;
          medium_url: string | null;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
          file_size: number | null;
          width: number | null;
          height: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['listing_images']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['listing_images']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          listing_id: string | null;
          buyer_id: string;
          seller_id: string;
          is_active: boolean;
          buyer_deleted: boolean;
          seller_deleted: boolean;
          last_message_id: string | null;
          last_message_at: string | null;
          last_message_preview: string | null;
          buyer_unread_count: number;
          seller_unread_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          attachment_url: string | null;
          attachment_type: string | null;
          is_read: boolean;
          read_at: string | null;
          is_deleted: boolean;
          is_system: boolean;
          system_type: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      reviews: {
        Row: {
          id: string;
          reviewer_id: string;
          reviewed_user_id: string;
          listing_id: string | null;
          transaction_id: string | null;
          rating: number;
          title: string | null;
          content: string | null;
          review_type: string;
          is_verified: boolean;
          is_visible: boolean;
          is_reported: boolean;
          is_approved: boolean;
          response: string | null;
          response_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
      };
      user_favorites: {
        Row: {
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_favorites']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_favorites']['Insert']>;
      };
      user_follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_follows']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_follows']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          reference_type: string | null;
          reference_id: string | null;
          action_url: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          reported_listing_id: string | null;
          report_type: ReportType;
          reason: string;
          evidence_urls: string[] | null;
          status: ReportStatus;
          resolved_by: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
      };
      offers: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          conversation_id: string | null;
          amount: number;
          message: string | null;
          status: string;
          response_message: string | null;
          responded_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['offers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['offers']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          amount: number;
          currency: string;
          platform_fee: number;
          payment_fee: number;
          seller_amount: number | null;
          status: TransactionStatus;
          payment_method: string | null;
          payment_reference: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      listing_boosts: {
        Row: {
          id: string;
          listing_id: string;
          user_id: string;
          boost_type: BoostType;
          duration_days: number;
          starts_at: string;
          expires_at: string;
          amount_paid: number;
          payment_reference: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['listing_boosts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['listing_boosts']['Insert']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: SubscriptionTier;
          amount: number;
          currency: string;
          billing_cycle: string;
          starts_at: string;
          expires_at: string;
          payment_method: string | null;
          payment_reference: string | null;
          is_active: boolean;
          auto_renew: boolean;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
      };
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Listing = Database['public']['Tables']['listings']['Row'];
export type ListingImage = Database['public']['Tables']['listing_images']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];
export type Offer = Database['public']['Tables']['offers']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type ListingBoost = Database['public']['Tables']['listing_boosts']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];

// Extended types with relations
export interface ListingWithDetails extends Listing {
  seller?: User;
  category?: Category;
  images?: ListingImage[];
  is_favorited?: boolean;
}

export interface ConversationWithDetails extends Conversation {
  buyer?: User;
  seller?: User;
  listing?: Listing;
  messages?: Message[];
}

export interface ReviewWithDetails extends Review {
  reviewer?: User;
  listing?: Listing;
}

export interface UserProfile extends User {
  listings?: Listing[];
  reviews?: ReviewWithDetails[];
  is_following?: boolean;
}
