-- Create exclusion constraint to prevent overlapping active tax configurations for the same code
-- Requires the btree_gist extension.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "gst_tax_configs"
ADD CONSTRAINT no_overlapping_active_tax_configs
EXCLUDE USING gist (
  organization_id WITH =,
  code WITH =,
  tstzrange(
    COALESCE(effective_from, '-infinity'),
    COALESCE(effective_to, 'infinity')
  ) WITH &&
)
WHERE (is_active = true AND deleted_at IS NULL);
