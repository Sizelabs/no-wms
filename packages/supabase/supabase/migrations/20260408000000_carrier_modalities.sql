-- =============================================================================
-- Migration: Carrier ↔ Modality many-to-many
-- =============================================================================
-- Replaces the hardcoded carriers.modality text column with a junction table
-- linking carriers to the organization-level modalities dimension.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create junction table
-- ---------------------------------------------------------------------------

CREATE TABLE carrier_modalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  modality_id uuid NOT NULL REFERENCES modalities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(carrier_id, modality_id)
);

ALTER TABLE carrier_modalities ENABLE ROW LEVEL SECURITY;

-- RLS: inherit access from carrier's organization
CREATE POLICY carrier_modalities_select ON carrier_modalities FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_modalities.carrier_id
      AND (c.organization_id = auth_org_id() OR auth_has_role('super_admin'))
  )
);
CREATE POLICY carrier_modalities_insert ON carrier_modalities FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_modalities.carrier_id
      AND (c.organization_id = auth_org_id() OR auth_has_role('super_admin'))
  )
);
CREATE POLICY carrier_modalities_delete ON carrier_modalities FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM carriers c
    WHERE c.id = carrier_modalities.carrier_id
      AND (c.organization_id = auth_org_id() OR auth_has_role('super_admin'))
  )
);

CREATE INDEX idx_carrier_modalities_carrier ON carrier_modalities(carrier_id);
CREATE INDEX idx_carrier_modalities_modality ON carrier_modalities(modality_id);

-- ---------------------------------------------------------------------------
-- 2. Migrate existing data: map legacy text codes to modality UUIDs
-- ---------------------------------------------------------------------------
-- air → aerea, ocean → maritima, ground → terrestre

INSERT INTO carrier_modalities (carrier_id, modality_id)
SELECT c.id, m.id
FROM carriers c
JOIN modalities m ON m.organization_id = c.organization_id
  AND (
    (c.modality = 'air' AND m.code = 'aerea')
    OR (c.modality = 'ocean' AND m.code = 'maritima')
    OR (c.modality = 'ground' AND m.code = 'terrestre')
  )
WHERE c.modality IS NOT NULL
ON CONFLICT (carrier_id, modality_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Drop legacy modality column from carriers
-- ---------------------------------------------------------------------------

-- Drop the unique constraint that includes modality
ALTER TABLE carriers DROP CONSTRAINT IF EXISTS carriers_organization_id_code_modality_key;

-- Drop the modality column (including its CHECK constraint)
ALTER TABLE carriers DROP COLUMN modality;

-- Add new unique constraint on (organization_id, code) only
ALTER TABLE carriers ADD CONSTRAINT carriers_organization_id_code_key UNIQUE (organization_id, code);
