-- Migration: Add deactivated_at column to profiles table
-- The is_active column already exists; this adds the deactivated_at timestamp.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
