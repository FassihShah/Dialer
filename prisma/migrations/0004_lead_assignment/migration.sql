-- Migration: 0004_lead_assignment
-- Adds assigned_to_id column to leads table so admins can assign leads to agents.

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigned_to_id" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_assigned_to_id_fkey'
  ) THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_assigned_to_id_fkey"
      FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "leads_assigned_to_id_idx" ON "leads"("assigned_to_id");
