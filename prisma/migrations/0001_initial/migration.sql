-- Add partial unique indexes for global deduplication
-- These cannot be expressed in Prisma schema directly but are critical for correctness.

-- Ensure normalized_phone is unique across all leads where not null
CREATE UNIQUE INDEX IF NOT EXISTS "leads_normalized_phone_unique"
  ON "leads" ("normalized_phone")
  WHERE "normalized_phone" IS NOT NULL;

-- Ensure normalized_email is unique across all leads where not null
CREATE UNIQUE INDEX IF NOT EXISTS "leads_normalized_email_unique"
  ON "leads" ("normalized_email")
  WHERE "normalized_email" IS NOT NULL;
