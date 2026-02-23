-- =====================================================
-- MARKETPLACE DATABASE SCHEMA
-- Production-ready PostgreSQL schema for Supabase
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- =====================================================
-- ENUMS
-- =====================================================

DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS listing_views CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS listing_boosts CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS listing_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS listing_images CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;


DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS listing_status CASCADE;
DROP TYPE IF EXISTS listing_condition CASCADE;
DROP TYPE IF EXISTS price_type CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;
DROP TYPE IF EXISTS report_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;
DROP TYPE IF EXISTS boost_type CASCADE;
DROP TYPE IF EXISTS verification_type CASCADE;

CREATE TYPE user_role AS ENUM ('user', 'seller', 'admin', 'super_admin');
CREATE TYPE listing_status AS ENUM ('draft', 'published', 'sold', 'archived', 'suspended');
CREATE TYPE listing_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');
CREATE TYPE price_type AS ENUM ('fixed', 'negotiable', 'free');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE report_type AS ENUM ('spam', 'inappropriate', 'scam', 'counterfeit', 'other');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled', 'disputed');
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE boost_type AS ENUM ('featured', 'highlight', 'urgent', 'top');
CREATE TYPE verification_type AS ENUM ('email', 'phone', 'id');

-- =====================================================
-- USERS TABLE
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- NULL for OAuth users

    -- Profile information
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,

    -- Location
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Philippines',
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),

    -- Role & Status
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_at TIMESTAMPTZ,

    -- Verification
    id_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,

    -- Subscription
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,

    -- Stats (denormalized for performance)
    listings_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,

    -- OAuth
    google_id VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE,

    -- Security
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_location ON users(location_city, location_country);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon name/class
    image_url TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- SEO
    meta_title VARCHAR(200),
    meta_description TEXT,

    -- Stats
    listings_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = TRUE;

-- =====================================================
-- LISTINGS TABLE - original
-- =====================================================

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    -- Basic info
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE NOT NULL,
    description TEXT NOT NULL,

    -- Pricing
    price DECIMAL(12, 2) NOT NULL,
    price_type price_type DEFAULT 'fixed',
    currency VARCHAR(3) DEFAULT 'PHP',
    original_price DECIMAL(12, 2), -- For showing discounts

    -- Product details
    condition listing_condition DEFAULT 'good',
    brand VARCHAR(100),
    model VARCHAR(100),

    -- Location
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    meetup_location TEXT,

    -- Status
    status listing_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    is_boosted BOOLEAN DEFAULT FALSE,
    boost_expires_at TIMESTAMPTZ,
    boost_type boost_type,

    -- Stats (denormalized)
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,

    -- Shipping
    offers_shipping BOOLEAN DEFAULT FALSE,
    shipping_fee DECIMAL(10, 2),
    shipping_details TEXT,

    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    moderation_notes TEXT,
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMPTZ,

    -- SEO
    meta_title VARCHAR(200),
    meta_description TEXT,

    -- Search (full-text)
    search_vector TSVECTOR,

    -- Timestamps
    published_at TIMESTAMPTZ,
    sold_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for listings
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_location ON listings(location_city, location_country);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_published_at ON listings(published_at DESC);
CREATE INDEX idx_listings_featured ON listings(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_listings_boosted ON listings(is_boosted, boost_expires_at) WHERE is_boosted = TRUE;
CREATE INDEX idx_listings_search ON listings USING GIN(search_vector);
CREATE INDEX idx_listings_condition ON listings(condition);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_listing_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.model, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_listing_search_vector
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_search_vector();

-- =====================================================
-- LISTINGS TABLE - proposed by AI (with more fields for better functionality)
-- =====================================================
-- =====================================================
-- LISTINGS TABLE (partial, search vector only)
-- =====================================================

-- Add the search_vector column if it doesn't exist
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Function to update search vector (trigger)
CREATE OR REPLACE FUNCTION update_listing_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.model, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_listing_search_vector ON listings;

CREATE TRIGGER trigger_listing_search_vector
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_listing_search_vector();

-- Create GIN index on the precomputed column
-- This is fully PostgreSQL-safe
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING GIN(search_vector);

-- =====================================================
-- LISTING IMAGES TABLE
-- =====================================================

CREATE TABLE listing_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

    -- Image URLs
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    medium_url TEXT,

    -- Metadata
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,

    -- File info
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    mime_type VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for listing_images
CREATE INDEX idx_listing_images_listing ON listing_images(listing_id);
CREATE INDEX idx_listing_images_primary ON listing_images(listing_id, is_primary) WHERE is_primary = TRUE;

-- =====================================================
-- TAGS TABLE
-- =====================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);

-- =====================================================
-- LISTING TAGS (Junction table)
-- =====================================================

CREATE TABLE listing_tags (
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (listing_id, tag_id)
);

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

    -- Participants
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    buyer_deleted BOOLEAN DEFAULT FALSE,
    seller_deleted BOOLEAN DEFAULT FALSE,

    -- Last message info (denormalized)
    last_message_id UUID,
    last_message_at TIMESTAMPTZ,
    last_message_preview VARCHAR(100),

    -- Unread counts
    buyer_unread_count INTEGER DEFAULT 0,
    seller_unread_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint to prevent duplicate conversations
    UNIQUE(listing_id, buyer_id, seller_id)
);

-- Indexes for conversations
CREATE INDEX idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller ON conversations(seller_id);
CREATE INDEX idx_conversations_listing ON conversations(listing_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,

    -- Attachments
    attachment_url TEXT,
    attachment_type VARCHAR(50),

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- System messages
    is_system BOOLEAN DEFAULT FALSE,
    system_type VARCHAR(50), -- 'offer', 'accepted', 'declined', etc.

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- =====================================================
-- OFFERS TABLE
-- =====================================================

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id),

    -- Offer details
    amount DECIMAL(12, 2) NOT NULL,
    message TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired, withdrawn

    -- Response
    response_message TEXT,
    responded_at TIMESTAMPTZ,

    -- Timestamps
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for offers
CREATE INDEX idx_offers_listing ON offers(listing_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_seller ON offers(seller_id);
CREATE INDEX idx_offers_status ON offers(status);

-- =====================================================
-- REVIEWS TABLE
-- =====================================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    transaction_id UUID,

    -- Rating
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

    -- Content
    title VARCHAR(200),
    content TEXT,

    -- Type
    review_type VARCHAR(20) DEFAULT 'seller', -- 'seller' or 'buyer'

    -- Status
    is_verified BOOLEAN DEFAULT FALSE, -- Verified purchase
    is_visible BOOLEAN DEFAULT TRUE,

    -- Moderation
    is_reported BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,

    -- Response
    response TEXT,
    response_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate reviews
    UNIQUE(reviewer_id, listing_id)
);

-- Indexes for reviews
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_user ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_listing ON reviews(listing_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Amount
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PHP',

    -- Fees
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    payment_fee DECIMAL(10, 2) DEFAULT 0,
    seller_amount DECIMAL(12, 2), -- Amount seller receives

    -- Status
    status transaction_status DEFAULT 'pending',

    -- Payment info
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),

    -- Completion
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_listing ON transactions(listing_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- =====================================================
-- USER FAVORITES/LIKES TABLE
-- =====================================================

CREATE TABLE user_favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_favorites_listing ON user_favorites(listing_id);

-- =====================================================
-- USER FOLLOWS TABLE
-- =====================================================

CREATE TABLE user_follows (
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_following ON user_follows(following_id);

-- =====================================================
-- REPORTS TABLE
-- =====================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Target (either user or listing)
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,

    -- Details
    report_type report_type NOT NULL,
    reason TEXT NOT NULL,
    evidence_urls TEXT[], -- Array of URLs

    -- Status
    status report_status DEFAULT 'pending',

    -- Resolution
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure at least one target
    CHECK (reported_user_id IS NOT NULL OR reported_listing_id IS NOT NULL)
);

-- Indexes for reports
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_user ON reports(reported_user_id) WHERE reported_user_id IS NOT NULL;
CREATE INDEX idx_reports_listing ON reports(reported_listing_id) WHERE reported_listing_id IS NOT NULL;
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- =====================================================
-- BOOSTS / PROMOTIONS TABLE
-- =====================================================

CREATE TABLE listing_boosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Boost details
    boost_type boost_type NOT NULL,

    -- Duration
    duration_days INTEGER NOT NULL,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Payment
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_reference VARCHAR(255),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for boosts
CREATE INDEX idx_boosts_listing ON listing_boosts(listing_id);
CREATE INDEX idx_boosts_user ON listing_boosts(user_id);
CREATE INDEX idx_boosts_active ON listing_boosts(is_active, expires_at) WHERE is_active = TRUE;

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Plan details
    tier subscription_tier NOT NULL,

    -- Billing
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PHP',
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly

    -- Duration
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Payment
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    auto_renew BOOLEAN DEFAULT TRUE,
    cancelled_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(is_active, expires_at) WHERE is_active = TRUE;

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    type VARCHAR(50) NOT NULL, -- message, offer, review, follow, system
    title VARCHAR(200) NOT NULL,
    body TEXT,

    -- Reference
    reference_type VARCHAR(50), -- listing, user, conversation, etc.
    reference_id UUID,

    -- Action URL
    action_url TEXT,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- SAVED SEARCHES TABLE
-- =====================================================

CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Search params
    name VARCHAR(100),
    query VARCHAR(255),
    category_id UUID REFERENCES categories(id),
    min_price DECIMAL(12, 2),
    max_price DECIMAL(12, 2),
    condition listing_condition,
    location VARCHAR(100),

    -- Notifications
    notify_new_listings BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_notified_at TIMESTAMPTZ
);

-- Indexes for saved searches
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- =====================================================
-- LISTING VIEWS TABLE (for analytics)
-- =====================================================

CREATE TABLE listing_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Analytics
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,

    -- Timestamps
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for listing views
CREATE INDEX idx_views_listing ON listing_views(listing_id);
CREATE INDEX idx_views_viewer ON listing_views(viewer_id) WHERE viewer_id IS NOT NULL;
CREATE INDEX idx_views_date ON listing_views(viewed_at);

-- Partial index to prevent duplicate views per session
CREATE UNIQUE INDEX idx_views_unique_session
    ON listing_views(listing_id, viewer_id, DATE(viewed_at))
    WHERE viewer_id IS NOT NULL;

-- =====================================================
-- REFRESH TOKENS TABLE
-- =====================================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,

    -- Device info
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,

    -- Status
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,

    -- Timestamps
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Indexes for refresh tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_valid ON refresh_tokens(user_id, is_revoked, expires_at)
    WHERE is_revoked = FALSE;

-- =====================================================
-- PASSWORD RESET TOKENS TABLE
-- =====================================================

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,

    -- Status
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,

    -- Timestamps
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for password reset tokens
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_hash ON password_reset_tokens(token_hash);

-- =====================================================
-- EMAIL VERIFICATION TOKENS TABLE
-- =====================================================

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,

    -- Status
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,

    -- Timestamps
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email verification tokens
CREATE INDEX idx_email_verification_user ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_hash ON email_verification_tokens(token_hash);

-- =====================================================
-- PLATFORM SETTINGS TABLE
-- =====================================================

CREATE TABLE platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO platform_settings (key, value, description) VALUES
('boost_prices', '{"featured": 99, "highlight": 49, "urgent": 79, "top": 149}', 'Boost type prices in PHP'),
('subscription_prices', '{"basic": 299, "pro": 599, "enterprise": 1499}', 'Monthly subscription prices'),
('platform_fee_percentage', '5', 'Platform fee percentage for transactions'),
('max_images_per_listing', '10', 'Maximum images allowed per listing'),
('max_listings_free_user', '20', 'Maximum active listings for free users'),
('listing_expiry_days', '30', 'Days until listing expires');

-- =====================================================
-- AUDIT LOG TABLE
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,

    -- Changes
    old_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_listing_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET listings_count = listings_count + 1 WHERE id = NEW.seller_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET listings_count = listings_count - 1 WHERE id = OLD.seller_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_listing_count
    AFTER INSERT OR DELETE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_listing_count();

-- Function to update category listing count
CREATE OR REPLACE FUNCTION update_category_listing_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.category_id IS NOT NULL THEN
        UPDATE categories SET listings_count = listings_count + 1 WHERE id = NEW.category_id;
    ELSIF TG_OP = 'DELETE' AND OLD.category_id IS NOT NULL THEN
        UPDATE categories SET listings_count = listings_count - 1 WHERE id = OLD.category_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
            IF OLD.category_id IS NOT NULL THEN
                UPDATE categories SET listings_count = listings_count - 1 WHERE id = OLD.category_id;
            END IF;
            IF NEW.category_id IS NOT NULL THEN
                UPDATE categories SET listings_count = listings_count + 1 WHERE id = NEW.category_id;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_category_listing_count
    AFTER INSERT OR UPDATE OR DELETE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_category_listing_count();

-- Function to update user rating
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE users SET
            rating_average = (SELECT AVG(rating) FROM reviews WHERE reviewed_user_id = NEW.reviewed_user_id AND is_visible = TRUE),
            rating_count = (SELECT COUNT(*) FROM reviews WHERE reviewed_user_id = NEW.reviewed_user_id AND is_visible = TRUE)
        WHERE id = NEW.reviewed_user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET
            rating_average = COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_user_id = OLD.reviewed_user_id AND is_visible = TRUE), 0),
            rating_count = (SELECT COUNT(*) FROM reviews WHERE reviewed_user_id = OLD.reviewed_user_id AND is_visible = TRUE)
        WHERE id = OLD.reviewed_user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating();

-- Function to update listing likes count
CREATE OR REPLACE FUNCTION update_listing_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE listings SET likes_count = likes_count + 1 WHERE id = NEW.listing_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE listings SET likes_count = likes_count - 1 WHERE id = OLD.listing_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_listing_likes_count
    AFTER INSERT OR DELETE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_likes_count();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
        UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_follow_counts
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_counts();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read for active users" ON users FOR SELECT USING (is_active = TRUE AND is_banned = FALSE);
CREATE POLICY "Public read for published listings" ON listings FOR SELECT USING (status = 'published');
CREATE POLICY "Public read for listing images" ON listing_images FOR SELECT USING (TRUE);
CREATE POLICY "Public read for active categories" ON categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read for visible reviews" ON reviews FOR SELECT USING (is_visible = TRUE);

-- User-specific policies (will be enforced via application layer with service role)
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage own listings" ON listings FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Users can manage own favorites" ON user_favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own follows" ON user_follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own conversations" ON conversations FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can read conversation messages" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);

-- =====================================================
-- SEED DATA: DEFAULT CATEGORIES
-- =====================================================

INSERT INTO categories (name, slug, icon, sort_order) VALUES
('Electronics', 'electronics', 'laptop', 1),
('Mobile Phones', 'mobile-phones', 'smartphone', 2),
('Vehicles', 'vehicles', 'car', 3),
('Property', 'property', 'home', 4),
('Fashion', 'fashion', 'shirt', 5),
('Home & Living', 'home-living', 'sofa', 6),
('Beauty & Personal Care', 'beauty', 'sparkles', 7),
('Sports & Outdoors', 'sports', 'dumbbell', 8),
('Toys & Games', 'toys-games', 'gamepad', 9),
('Books & Media', 'books-media', 'book', 10),
('Pets', 'pets', 'paw', 11),
('Services', 'services', 'wrench', 12),
('Jobs', 'jobs', 'briefcase', 13),
('Others', 'others', 'grid', 14);

-- Subcategories for Electronics
INSERT INTO categories (name, slug, icon, parent_id, sort_order) VALUES
('Laptops', 'laptops', 'laptop', (SELECT id FROM categories WHERE slug = 'electronics'), 1),
('Tablets', 'tablets', 'tablet', (SELECT id FROM categories WHERE slug = 'electronics'), 2),
('Cameras', 'cameras', 'camera', (SELECT id FROM categories WHERE slug = 'electronics'), 3),
('TVs & Monitors', 'tvs-monitors', 'monitor', (SELECT id FROM categories WHERE slug = 'electronics'), 4),
('Audio', 'audio', 'headphones', (SELECT id FROM categories WHERE slug = 'electronics'), 5),
('Gaming', 'gaming', 'gamepad', (SELECT id FROM categories WHERE slug = 'electronics'), 6);

-- Subcategories for Mobile Phones
INSERT INTO categories (name, slug, icon, parent_id, sort_order) VALUES
('Smartphones', 'smartphones', 'smartphone', (SELECT id FROM categories WHERE slug = 'mobile-phones'), 1),
('Accessories', 'phone-accessories', 'cable', (SELECT id FROM categories WHERE slug = 'mobile-phones'), 2),
('Wearables', 'wearables', 'watch', (SELECT id FROM categories WHERE slug = 'mobile-phones'), 3);

-- Subcategories for Vehicles
INSERT INTO categories (name, slug, icon, parent_id, sort_order) VALUES
('Cars', 'cars', 'car', (SELECT id FROM categories WHERE slug = 'vehicles'), 1),
('Motorcycles', 'motorcycles', 'bike', (SELECT id FROM categories WHERE slug = 'vehicles'), 2),
('Bicycles', 'bicycles', 'bicycle', (SELECT id FROM categories WHERE slug = 'vehicles'), 3),
('Parts & Accessories', 'vehicle-parts', 'cog', (SELECT id FROM categories WHERE slug = 'vehicles'), 4);

-- Subcategories for Fashion
INSERT INTO categories (name, slug, icon, parent_id, sort_order) VALUES
('Men''s Fashion', 'mens-fashion', 'user', (SELECT id FROM categories WHERE slug = 'fashion'), 1),
('Women''s Fashion', 'womens-fashion', 'user', (SELECT id FROM categories WHERE slug = 'fashion'), 2),
('Kids'' Fashion', 'kids-fashion', 'baby', (SELECT id FROM categories WHERE slug = 'fashion'), 3),
('Bags & Wallets', 'bags-wallets', 'bag', (SELECT id FROM categories WHERE slug = 'fashion'), 4),
('Watches', 'watches', 'watch', (SELECT id FROM categories WHERE slug = 'fashion'), 5),
('Jewelry', 'jewelry', 'gem', (SELECT id FROM categories WHERE slug = 'fashion'), 6),
('Shoes', 'shoes', 'footprints', (SELECT id FROM categories WHERE slug = 'fashion'), 7);

-- =====================================================
-- SEED DATA: SAMPLE USERS
-- =====================================================

INSERT INTO users (
    email,
    email_verified,
    username,
    display_name,
    role,
    location_city,
    location_state,
    location_country
) VALUES
('seller.alex@example.com', TRUE, 'alextech', 'Alex Tech', 'seller', 'Quezon City', 'Metro Manila', 'Philippines'),
('seller.mia@example.com', TRUE, 'miagadgets', 'Mia Gadgets', 'seller', 'Makati', 'Metro Manila', 'Philippines'),
('seller.noah@example.com', TRUE, 'noahrides', 'Noah Rides', 'seller', 'Cebu City', 'Cebu', 'Philippines'),
('seller.lia@example.com', TRUE, 'liafash', 'Lia Fashion', 'seller', 'Davao City', 'Davao del Sur', 'Philippines'),
('seller.ethan@example.com', TRUE, 'ethanhome', 'Ethan Home', 'seller', 'Pasig', 'Metro Manila', 'Philippines'),
('seller.sophia@example.com', TRUE, 'sophiasport', 'Sophia Sport', 'seller', 'Taguig', 'Metro Manila', 'Philippines'),
('seller.lucas@example.com', TRUE, 'lucasbooks', 'Lucas Books', 'seller', 'Iloilo City', 'Iloilo', 'Philippines'),
('seller.emma@example.com', TRUE, 'emmapets', 'Emma Pets', 'seller', 'Bacolod', 'Negros Occidental', 'Philippines'),
('seller.ryan@example.com', TRUE, 'ryanservices', 'Ryan Services', 'seller', 'Cagayan de Oro', 'Misamis Oriental', 'Philippines'),
('seller.zoe@example.com', TRUE, 'zoeproperty', 'Zoe Property', 'seller', 'Manila', 'Metro Manila', 'Philippines')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SEED DATA: SAMPLE LISTINGS
-- =====================================================

WITH ensured_users AS (
    INSERT INTO users (
        email,
        email_verified,
        username,
        display_name,
        role,
        location_city,
        location_state,
        location_country
    ) VALUES
    ('seller.alex@example.com', TRUE, 'alextech', 'Alex Tech', 'seller', 'Quezon City', 'Metro Manila', 'Philippines'),
    ('seller.mia@example.com', TRUE, 'miagadgets', 'Mia Gadgets', 'seller', 'Makati', 'Metro Manila', 'Philippines'),
    ('seller.noah@example.com', TRUE, 'noahrides', 'Noah Rides', 'seller', 'Cebu City', 'Cebu', 'Philippines'),
    ('seller.lia@example.com', TRUE, 'liafash', 'Lia Fashion', 'seller', 'Davao City', 'Davao del Sur', 'Philippines'),
    ('seller.ethan@example.com', TRUE, 'ethanhome', 'Ethan Home', 'seller', 'Pasig', 'Metro Manila', 'Philippines'),
    ('seller.sophia@example.com', TRUE, 'sophiasport', 'Sophia Sport', 'seller', 'Taguig', 'Metro Manila', 'Philippines'),
    ('seller.lucas@example.com', TRUE, 'lucasbooks', 'Lucas Books', 'seller', 'Iloilo City', 'Iloilo', 'Philippines'),
    ('seller.emma@example.com', TRUE, 'emmapets', 'Emma Pets', 'seller', 'Bacolod', 'Negros Occidental', 'Philippines'),
    ('seller.ryan@example.com', TRUE, 'ryanservices', 'Ryan Services', 'seller', 'Cagayan de Oro', 'Misamis Oriental', 'Philippines'),
    ('seller.zoe@example.com', TRUE, 'zoeproperty', 'Zoe Property', 'seller', 'Manila', 'Metro Manila', 'Philippines')
    ON CONFLICT (email) DO NOTHING
),
listing_seed (
    seller_email,
    category_slug,
    title,
    slug,
    description,
    price,
    condition,
    brand,
    model,
    location_city,
    location_state,
    location_country,
    status,
    published_at
) AS (
    VALUES
    ('seller.alex@example.com', 'laptops', 'MacBook Air M1 256GB', 'macbook-air-m1-256gb-qc', 'Smooth performance, 91% battery health, includes charger and sleeve.', 36500.00, 'like_new', 'Apple', 'MacBook Air M1', 'Quezon City', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '14 days'),
    ('seller.mia@example.com', 'tablets', 'iPad 10th Gen WiFi 64GB', 'ipad-10th-gen-64gb-makati', 'Used lightly for school notes, with tempered glass and case.', 22000.00, 'like_new', 'Apple', 'iPad 10th Gen', 'Makati', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '12 days'),
    ('seller.alex@example.com', 'cameras', 'Sony A6400 Mirrorless Body', 'sony-a6400-body-manila', 'Excellent autofocus, low shutter count, includes battery and strap.', 38500.00, 'good', 'Sony', 'A6400', 'Manila', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '10 days'),
    ('seller.ethan@example.com', 'tvs-monitors', 'LG 27-inch 144Hz Gaming Monitor', 'lg-27-144hz-monitor-pasig', 'No dead pixels, complete with stand and HDMI cable.', 9800.00, 'good', 'LG', '27GN750', 'Pasig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '8 days'),
    ('seller.mia@example.com', 'audio', 'Sony WH-1000XM4 Headphones', 'sony-wh1000xm4-taguig', 'Great ANC and battery, with original carrying case.', 9900.00, 'like_new', 'Sony', 'WH-1000XM4', 'Taguig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '7 days'),
    ('seller.alex@example.com', 'gaming', 'PlayStation 5 Disc Edition', 'ps5-disc-edition-qc', 'Well maintained console with one controller and box.', 27500.00, 'good', 'Sony', 'PS5', 'Quezon City', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '6 days'),
    ('seller.mia@example.com', 'smartphones', 'Samsung Galaxy S23 256GB', 'samsung-galaxy-s23-256gb-makati', 'Factory unlocked, no major dents, includes fast charger.', 28500.00, 'like_new', 'Samsung', 'Galaxy S23', 'Makati', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '11 days'),
    ('seller.mia@example.com', 'phone-accessories', 'Anker 20,000mAh Power Bank', 'anker-20000mah-power-bank-bgc', 'Supports PD fast charging, rarely used.', 1700.00, 'good', 'Anker', 'PowerCore 20K', 'Taguig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '9 days'),
    ('seller.alex@example.com', 'wearables', 'Apple Watch Series 8 45mm GPS', 'apple-watch-series-8-45mm-qc', 'Minor signs of use, 93% battery health.', 14500.00, 'good', 'Apple', 'Watch Series 8', 'Quezon City', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '5 days'),
    ('seller.noah@example.com', 'cars', '2018 Toyota Vios 1.3 E MT', '2018-toyota-vios-cebu', 'Casa maintained, complete papers, fresh registration.', 435000.00, 'good', 'Toyota', 'Vios', 'Cebu City', 'Cebu', 'Philippines', 'published', NOW() - INTERVAL '20 days'),
    ('seller.noah@example.com', 'motorcycles', 'Yamaha NMAX 155 ABS 2021', 'yamaha-nmax-155-2021-cebu', 'Good running condition, with top box included.', 118000.00, 'good', 'Yamaha', 'NMAX 155', 'Cebu City', 'Cebu', 'Philippines', 'published', NOW() - INTERVAL '16 days'),
    ('seller.noah@example.com', 'bicycles', 'Giant Escape 3 Medium Frame', 'giant-escape-3-iloilo', 'Aluminum frame hybrid bike, ready to ride.', 14500.00, 'good', 'Giant', 'Escape 3', 'Iloilo City', 'Iloilo', 'Philippines', 'published', NOW() - INTERVAL '13 days'),
    ('seller.noah@example.com', 'vehicle-parts', 'Michelin 205/55R16 Tire Set', 'michelin-205-55r16-set-davao', 'Set of 4 with around 80% thread life left.', 12000.00, 'good', 'Michelin', 'Primacy 4', 'Davao City', 'Davao del Sur', 'Philippines', 'published', NOW() - INTERVAL '15 days'),
    ('seller.lia@example.com', 'mens-fashion', 'Levis 511 Slim Jeans Size 32', 'levis-511-slim-jeans-davao', 'Original pair, minimal fading, no tears.', 1800.00, 'good', 'Levis', '511', 'Davao City', 'Davao del Sur', 'Philippines', 'published', NOW() - INTERVAL '9 days'),
    ('seller.lia@example.com', 'womens-fashion', 'Zara Linen Midi Dress Small', 'zara-linen-midi-dress-makati', 'Lightweight and elegant, worn twice only.', 1500.00, 'like_new', 'Zara', 'Linen Midi', 'Makati', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '7 days'),
    ('seller.lia@example.com', 'kids-fashion', 'Kids Winter Jacket Set 4-6Y', 'kids-winter-jacket-set-pasig', 'Two thick jackets in good condition.', 900.00, 'good', 'Uniqlo', 'Kids Jacket', 'Pasig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '6 days'),
    ('seller.lia@example.com', 'bags-wallets', 'Coach Leather Shoulder Bag', 'coach-leather-shoulder-bag-bgc', 'Authentic piece, clean interior, with dust bag.', 7500.00, 'good', 'Coach', 'Tabby', 'Taguig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '12 days'),
    ('seller.lia@example.com', 'watches', 'Seiko 5 Automatic SNK809', 'seiko-5-automatic-snk809-qc', 'Runs accurately, with extra NATO strap.', 5800.00, 'good', 'Seiko', 'SNK809', 'Quezon City', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '10 days'),
    ('seller.lia@example.com', 'jewelry', '18K Gold Necklace 4.2g', '18k-gold-necklace-manila', 'Pawnable quality gold necklace, complete receipt.', 15200.00, 'good', 'Oro', '18K Chain', 'Manila', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '18 days'),
    ('seller.lia@example.com', 'shoes', 'Nike Air Force 1 White Size 9', 'nike-air-force-1-size-9-cebu', 'Classic white pair, cleaned and ready to wear.', 3900.00, 'good', 'Nike', 'Air Force 1', 'Cebu City', 'Cebu', 'Philippines', 'published', NOW() - INTERVAL '8 days'),
    ('seller.ethan@example.com', 'home-living', 'Ikea 3-Seater Fabric Sofa', 'ikea-3-seater-sofa-pasig', 'Comfortable sofa, no tears, slightly used.', 12000.00, 'good', 'Ikea', 'Kivik', 'Pasig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '14 days'),
    ('seller.lia@example.com', 'beauty', 'Dyson Airwrap Complete Set', 'dyson-airwrap-complete-set-makati', 'Complete attachments and case, authentic unit.', 22500.00, 'like_new', 'Dyson', 'Airwrap', 'Makati', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '11 days'),
    ('seller.sophia@example.com', 'sports', 'Adjustable Dumbbells 40kg Pair', 'adjustable-dumbbells-40kg-taguig', 'Durable plates with steel handles and collars.', 5200.00, 'good', 'Bowflex', 'Adjustable 40kg', 'Taguig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '6 days'),
    ('seller.sophia@example.com', 'toys-games', 'LEGO Star Wars X-Wing Set', 'lego-star-wars-xwing-bacolod', '99% complete with minifigures and manual.', 3400.00, 'good', 'LEGO', '75301', 'Bacolod', 'Negros Occidental', 'Philippines', 'published', NOW() - INTERVAL '5 days'),
    ('seller.lucas@example.com', 'books-media', 'Atomic Habits Hardcover', 'atomic-habits-hardcover-iloilo', 'Original copy, no highlights, almost new.', 480.00, 'like_new', 'Avery', 'Atomic Habits', 'Iloilo City', 'Iloilo', 'Philippines', 'published', NOW() - INTERVAL '4 days'),
    ('seller.emma@example.com', 'pets', 'Aquarium Starter Kit 20 Gallon', 'aquarium-starter-kit-cdo', 'Includes tank, filter, lights, and gravel.', 4500.00, 'good', 'AquaOne', '20 Gallon Kit', 'Cagayan de Oro', 'Misamis Oriental', 'Philippines', 'published', NOW() - INTERVAL '7 days'),
    ('seller.ryan@example.com', 'services', 'Home Cleaning Service Package', 'home-cleaning-service-manila', 'General cleaning package for condos up to 40 sqm.', 1500.00, 'new', 'CleanPro', 'Standard Package', 'Manila', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '3 days'),
    ('seller.ryan@example.com', 'jobs', 'Hiring Part-time Barista', 'hiring-part-time-barista-qc', 'Cafe in Tomas Morato hiring experienced part-time barista.', 18000.00, 'new', 'Cafe Bloom', 'Part-time', 'Quezon City', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '2 days'),
    ('seller.zoe@example.com', 'property', 'Studio Condo for Rent in BGC', 'studio-condo-rent-bgc', '24 sqm furnished unit, near High Street, 1-month deposit.', 23000.00, 'good', 'Avida', 'Studio Unit', 'Taguig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '9 days'),
    ('seller.ryan@example.com', 'others', 'Assorted Office Chairs Bundle', 'assorted-office-chairs-bundle-pasig', 'Bundle of 5 ergonomic office chairs from office pullout.', 10000.00, 'fair', 'Ofix', 'Mixed Models', 'Pasig', 'Metro Manila', 'Philippines', 'published', NOW() - INTERVAL '5 days')
)
INSERT INTO listings (
    seller_id,
    category_id,
    title,
    slug,
    description,
    price,
    condition,
    brand,
    model,
    location_city,
    location_state,
    location_country,
    status,
    published_at
)
SELECT
    u.id,
    c.id,
    ls.title,
    ls.slug,
    ls.description,
    ls.price,
    ls.condition::listing_condition,
    ls.brand,
    ls.model,
    ls.location_city,
    ls.location_state,
    ls.location_country,
    ls.status::listing_status,
    ls.published_at
FROM listing_seed ls
JOIN users u ON u.email = ls.seller_email
JOIN categories c ON c.slug = ls.category_slug
ON CONFLICT (slug) DO NOTHING;

COMMIT;
