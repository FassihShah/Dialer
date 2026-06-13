-- ════════════════════════════════════════════════════════════════════════════
-- 0002_workspaces — introduce multi-tenant Workspaces (Phase A: additive + backfill)
--
-- SAFETY: every change here is additive. New columns are NULLABLE and backfilled
-- so existing rows (current admin, VoIPConfig, numbers, leads) are untouched apart
-- from gaining a workspace_id pointing at the "Default Workspace". No NOT NULL
-- constraints are applied here — that is Phase B (0003), run only after this is
-- verified in production.
--
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add 'super_admin' to the UserRole enum (no-op if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'super_admin' BEFORE 'admin';
  END IF;
END$$;

-- 2. Create the workspaces table
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id"            TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "slug"          TEXT NOT NULL,
  "status"        "UserStatus" NOT NULL DEFAULT 'active',
  "created_by_id" TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_key" ON "workspaces" ("slug");

-- 3. Add nullable workspace_id columns to every scoped table
ALTER TABLE "users"          ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "leads"          ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "phone_numbers"  ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "voip_configs"   ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "call_logs"      ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "follow_ups"     ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "dnc_entries"    ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "import_batches" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;

-- 4. Foreign keys (added NOT VALID-free; nullable so existing rows are fine)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_workspace_id_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_workspace_id_fkey') THEN
    ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phone_numbers_workspace_id_fkey') THEN
    ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'voip_configs_workspace_id_fkey') THEN
    ALTER TABLE "voip_configs" ADD CONSTRAINT "voip_configs_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'call_logs_workspace_id_fkey') THEN
    ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follow_ups_workspace_id_fkey') THEN
    ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dnc_entries_workspace_id_fkey') THEN
    ALTER TABLE "dnc_entries" ADD CONSTRAINT "dnc_entries_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'import_batches_workspace_id_fkey') THEN
    ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- 5. Secondary indexes for workspace_id lookups
CREATE INDEX IF NOT EXISTS "leads_workspace_id_idx"          ON "leads" ("workspace_id");
CREATE INDEX IF NOT EXISTS "phone_numbers_workspace_id_idx"  ON "phone_numbers" ("workspace_id");
CREATE INDEX IF NOT EXISTS "voip_configs_workspace_id_idx"   ON "voip_configs" ("workspace_id");
CREATE INDEX IF NOT EXISTS "call_logs_workspace_id_idx"      ON "call_logs" ("workspace_id");
CREATE INDEX IF NOT EXISTS "follow_ups_workspace_id_idx"     ON "follow_ups" ("workspace_id");
CREATE INDEX IF NOT EXISTS "dnc_entries_workspace_id_idx"    ON "dnc_entries" ("workspace_id");

-- 6. BACKFILL: create the Default Workspace and attach every existing row to it.
--    Deterministic id so re-runs and seed.ts agree.
INSERT INTO "workspaces" ("id", "name", "slug", "status")
VALUES ('ws_default0000000000000000', 'Default Workspace', 'default', 'active')
ON CONFLICT ("slug") DO NOTHING;

-- Resolve the default workspace id (handles the case where it already existed
-- under a different id from a prior partial run).
DO $$
DECLARE
  ws_id TEXT;
BEGIN
  SELECT "id" INTO ws_id FROM "workspaces" WHERE "slug" = 'default' LIMIT 1;

  -- Compare role as text: a freshly-added enum value cannot be referenced as an
  -- enum literal in the same transaction that added it (Postgres restriction).
  UPDATE "users"          SET "workspace_id" = ws_id WHERE "workspace_id" IS NULL AND "role"::text <> 'super_admin';
  UPDATE "leads"          SET "workspace_id" = ws_id WHERE "workspace_id" IS NULL;
  UPDATE "phone_numbers"  SET "workspace_id" = ws_id WHERE "workspace_id" IS NULL;
  UPDATE "voip_configs"   SET "workspace_id" = ws_id WHERE "workspace_id" IS NULL;
  UPDATE "call_logs"      SET "workspace_id" = ws_id WHERE "workspace_id" IS NULL;
  UPDATE "follow_ups"     SET "workspace_id" = ws_id WHERE "workspace_id" IS NULL;
  UPDATE "dnc_entries"    SET "workspace_id" = ws_id WHERE "workspace_id" IS NULL;
  UPDATE "import_batches" SET "workspace_id" = ws_id WHERE "workspace_id" IS NULL;
END$$;

-- 7. Swap global dedup unique indexes for per-workspace composite ones.
--    Safe: all existing leads now share the default workspace, so the composite
--    index cannot introduce a collision that the old global index didn't already forbid.
DROP INDEX IF EXISTS "leads_normalized_phone_unique";
DROP INDEX IF EXISTS "leads_normalized_email_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "leads_ws_normalized_phone_unique"
  ON "leads" ("workspace_id", "normalized_phone")
  WHERE "normalized_phone" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "leads_ws_normalized_email_unique"
  ON "leads" ("workspace_id", "normalized_email")
  WHERE "normalized_email" IS NOT NULL;
