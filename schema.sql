-- Pomodoro Timer - PostgreSQL Schema
-- Run this once to initialize the database

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    display_name_lower VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    photo_url TEXT,
    friend_code VARCHAR(20) UNIQUE NOT NULL,
    public_key JSONB,
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FRIEND CODES (fast lookup by code)
-- ============================================
CREATE TABLE IF NOT EXISTS friend_codes (
    code VARCHAR(20) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- CHATS
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR(100) PRIMARY KEY,
    participant1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message TEXT DEFAULT '',
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MESSAGES (server-side encrypted)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(100) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    encrypted_text TEXT NOT NULL,
    iv VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- APP DATA (cloud sync - one row per user)
-- ============================================
CREATE TABLE IF NOT EXISTS app_data (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    tasks JSONB DEFAULT '[]',
    stats JSONB DEFAULT '{}',
    music_prefs JSONB DEFAULT '{}',
    music_volume FLOAT DEFAULT 0.5,
    theme VARCHAR(50) DEFAULT 'dark',
    daily_goal JSONB DEFAULT '{}',
    favorite_stations JSONB DEFAULT '[]',
    user_profile JSONB DEFAULT '{}',
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FEEDBACK / REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_display_name_lower ON users(display_name_lower);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chats_participant1 ON chats(participant1);
CREATE INDEX IF NOT EXISTS idx_chats_participant2 ON chats(participant2);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
