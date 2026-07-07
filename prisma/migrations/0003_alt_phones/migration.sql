-- Add alt_phones column to leads for storing additional phone numbers.
-- Stored as a JSON array string: '["...", "..."]'
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "alt_phones" TEXT;
