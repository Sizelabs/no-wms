-- ============================================================================
-- Migration: Shipping Categories with rule columns
-- ============================================================================

-- 1a. Create shipping_categories table
CREATE TABLE shipping_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  -- Rule columns
  max_weight_kg numeric(10,2),
  min_declared_value_usd numeric(12,2),
  max_declared_value_usd numeric(12,2),
  cargo_type text NOT NULL DEFAULT 'general' CHECK (cargo_type IN ('documents_only','general','dangerous_goods')),
  allows_dgr boolean NOT NULL DEFAULT false,
  requires_cedula boolean NOT NULL DEFAULT false,
  requires_ruc boolean NOT NULL DEFAULT false,
  customs_declaration_type text NOT NULL DEFAULT 'none' CHECK (customs_declaration_type IN ('none','simplified','formal')),
  country_specific_rules jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, country_code, code)
);

ALTER TABLE shipping_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY sc_select ON shipping_categories FOR SELECT USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY sc_insert ON shipping_categories FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY sc_update ON shipping_categories FOR UPDATE USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY sc_delete ON shipping_categories FOR DELETE USING (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);

CREATE TRIGGER set_shipping_categories_updated_at
  BEFORE UPDATE ON shipping_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_shipping_categories
  AFTER INSERT OR UPDATE OR DELETE ON shipping_categories
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- 1b. Create shipping_category_required_documents table
CREATE TABLE shipping_category_required_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_category_id uuid NOT NULL REFERENCES shipping_categories(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  label text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipping_category_required_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY scrd_select ON shipping_category_required_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM shipping_categories sc WHERE sc.id = shipping_category_id AND (auth_has_role('super_admin') OR sc.organization_id = auth_org_id()))
);
CREATE POLICY scrd_insert ON shipping_category_required_documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM shipping_categories sc WHERE sc.id = shipping_category_id AND (auth_has_role('super_admin') OR sc.organization_id = auth_org_id()))
);
CREATE POLICY scrd_update ON shipping_category_required_documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM shipping_categories sc WHERE sc.id = shipping_category_id AND (auth_has_role('super_admin') OR sc.organization_id = auth_org_id()))
);
CREATE POLICY scrd_delete ON shipping_category_required_documents FOR DELETE USING (
  EXISTS (SELECT 1 FROM shipping_categories sc WHERE sc.id = shipping_category_id AND (auth_has_role('super_admin') OR sc.organization_id = auth_org_id()))
);

-- 1c. Create shipping_instruction_documents table
CREATE TABLE shipping_instruction_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  shipping_instruction_id uuid NOT NULL REFERENCES shipping_instructions(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text NOT NULL,
  file_size integer,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_si_documents_si ON shipping_instruction_documents(shipping_instruction_id);

ALTER TABLE shipping_instruction_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY sid_select ON shipping_instruction_documents FOR SELECT USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);
CREATE POLICY sid_insert ON shipping_instruction_documents FOR INSERT WITH CHECK (
  organization_id = auth_org_id() OR auth_has_role('super_admin')
);
CREATE POLICY sid_delete ON shipping_instruction_documents FOR DELETE USING (
  auth_has_role('super_admin') OR organization_id = auth_org_id()
);

-- 1d. Create si-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('si-documents', 'si-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_si_docs" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'si-documents');

CREATE POLICY "auth_read_si_docs" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'si-documents');

CREATE POLICY "auth_delete_si_docs" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'si-documents');

-- 1e. Add shipping_category_id + category_snapshot to shipping_instructions
ALTER TABLE shipping_instructions
  ADD COLUMN shipping_category_id uuid REFERENCES shipping_categories(id) ON DELETE SET NULL;

ALTER TABLE shipping_instructions
  ADD COLUMN category_snapshot jsonb;

CREATE INDEX idx_si_shipping_category ON shipping_instructions(shipping_category_id);

-- 1f. Seed Ecuador defaults for all existing organizations
DO $$
DECLARE
  org_record RECORD;
  cat_a_id uuid;
  cat_b_id uuid;
  cat_bplus_id uuid;
  cat_c_id uuid;
  cat_d_id uuid;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    -- Cat A: Documentos / Correspondencia
    INSERT INTO shipping_categories (organization_id, country_code, code, name, description, display_order, max_weight_kg, min_declared_value_usd, max_declared_value_usd, cargo_type, allows_dgr, requires_cedula, requires_ruc, customs_declaration_type, country_specific_rules)
    VALUES (org_record.id, 'EC', 'A', 'Documentos / Correspondencia', 'Solo documentos y correspondencia sin valor comercial', 1, NULL, NULL, NULL, 'documents_only', false, false, false, 'none', '{}')
    ON CONFLICT (organization_id, country_code, code) DO NOTHING
    RETURNING id INTO cat_a_id;

    -- Cat B: Paquetes hasta 4kg/$400 (4x4)
    INSERT INTO shipping_categories (organization_id, country_code, code, name, description, display_order, max_weight_kg, min_declared_value_usd, max_declared_value_usd, cargo_type, allows_dgr, requires_cedula, requires_ruc, customs_declaration_type, country_specific_rules)
    VALUES (org_record.id, 'EC', 'B', 'Paquetes hasta 4kg/$400 (4x4)', 'Regimen simplificado — consume cupo 4x4', 2, 4, NULL, 400, 'general', false, true, false, 'simplified', '{"consumes_cupo_4x4": true}')
    ON CONFLICT (organization_id, country_code, code) DO NOTHING
    RETURNING id INTO cat_b_id;

    -- Cat B+: Paquetes 4-50kg o $400-$2000
    INSERT INTO shipping_categories (organization_id, country_code, code, name, description, display_order, max_weight_kg, min_declared_value_usd, max_declared_value_usd, cargo_type, allows_dgr, requires_cedula, requires_ruc, customs_declaration_type, country_specific_rules)
    VALUES (org_record.id, 'EC', 'B+', 'Paquetes 4-50kg o $400-$2000', 'Regimen simplificado extendido — requiere documentos comerciales', 3, 50, 400.01, 2000, 'general', false, true, false, 'simplified', '{}')
    ON CONFLICT (organization_id, country_code, code) DO NOTHING
    RETURNING id INTO cat_bplus_id;

    -- Cat C: Mercancia formal (DAI)
    INSERT INTO shipping_categories (organization_id, country_code, code, name, description, display_order, max_weight_kg, min_declared_value_usd, max_declared_value_usd, cargo_type, allows_dgr, requires_cedula, requires_ruc, customs_declaration_type, country_specific_rules)
    VALUES (org_record.id, 'EC', 'C', 'Mercancia formal (DAI)', 'Declaracion aduanera de importacion — requiere RUC y agente de aduanas', 4, NULL, 2000.01, NULL, 'general', false, false, true, 'formal', '{}')
    ON CONFLICT (organization_id, country_code, code) DO NOTHING
    RETURNING id INTO cat_c_id;

    -- Cat D: Mercancia peligrosa/restringida
    INSERT INTO shipping_categories (organization_id, country_code, code, name, description, display_order, max_weight_kg, min_declared_value_usd, max_declared_value_usd, cargo_type, allows_dgr, requires_cedula, requires_ruc, customs_declaration_type, country_specific_rules)
    VALUES (org_record.id, 'EC', 'D', 'Mercancia peligrosa/restringida', 'Requiere permisos especiales INEN y manejo DGR', 5, NULL, NULL, NULL, 'dangerous_goods', true, false, true, 'formal', '{}')
    ON CONFLICT (organization_id, country_code, code) DO NOTHING
    RETURNING id INTO cat_d_id;

    -- Required documents for Cat B+
    IF cat_bplus_id IS NOT NULL THEN
      INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
        (cat_bplus_id, 'commercial_invoice', 'Factura Comercial', true),
        (cat_bplus_id, 'packing_list', 'Lista de Empaque', true);
    END IF;

    -- Required documents for Cat C
    IF cat_c_id IS NOT NULL THEN
      INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
        (cat_c_id, 'commercial_invoice', 'Factura Comercial', true),
        (cat_c_id, 'packing_list', 'Lista de Empaque', true),
        (cat_c_id, 'power_of_attorney', 'Poder de Autorizacion', true);
    END IF;

    -- Required documents for Cat D
    IF cat_d_id IS NOT NULL THEN
      INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
        (cat_d_id, 'commercial_invoice', 'Factura Comercial', true),
        (cat_d_id, 'packing_list', 'Lista de Empaque', true),
        (cat_d_id, 'inen_certificate', 'Certificado INEN', true),
        (cat_d_id, 'special_permit', 'Permiso Especial', true);
    END IF;

  END LOOP;
END $$;

-- 1g. Update seed_org_defaults() trigger to include shipping categories
CREATE OR REPLACE FUNCTION seed_org_defaults()
RETURNS TRIGGER AS $$
DECLARE
  cat_bplus_id uuid;
  cat_c_id uuid;
  cat_d_id uuid;
BEGIN
  -- Default modalities
  INSERT INTO modalities (organization_id, name, code, display_order) VALUES
    (NEW.id, 'Aerea',     'aerea',     1),
    (NEW.id, 'Maritima',  'maritima',  2),
    (NEW.id, 'Courier',   'courier',   3),
    (NEW.id, 'Terrestre', 'terrestre', 4)
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Default handling costs
  INSERT INTO handling_costs (organization_id, name) VALUES
    (NEW.id, 'Flete Aereo Minimo'),
    (NEW.id, 'Flete Aereo x KG'),
    (NEW.id, 'FSC x KG'),
    (NEW.id, 'SCR x KG'),
    (NEW.id, 'SED'),
    (NEW.id, 'MAWB'),
    (NEW.id, 'HAWB'),
    (NEW.id, 'Delivery por KG'),
    (NEW.id, 'DGR'),
    (NEW.id, 'Ordenes de Trabajo'),
    (NEW.id, 'Bodegaje'),
    (NEW.id, 'Handling')
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- Default Ecuador shipping categories
  INSERT INTO shipping_categories (organization_id, country_code, code, name, description, display_order, max_weight_kg, min_declared_value_usd, max_declared_value_usd, cargo_type, allows_dgr, requires_cedula, requires_ruc, customs_declaration_type, country_specific_rules)
  VALUES
    (NEW.id, 'EC', 'A', 'Documentos / Correspondencia', 'Solo documentos y correspondencia sin valor comercial', 1, NULL, NULL, NULL, 'documents_only', false, false, false, 'none', '{}'),
    (NEW.id, 'EC', 'B', 'Paquetes hasta 4kg/$400 (4x4)', 'Regimen simplificado — consume cupo 4x4', 2, 4, NULL, 400, 'general', false, true, false, 'simplified', '{"consumes_cupo_4x4": true}'),
    (NEW.id, 'EC', 'B+', 'Paquetes 4-50kg o $400-$2000', 'Regimen simplificado extendido — requiere documentos comerciales', 3, 50, 400.01, 2000, 'general', false, true, false, 'simplified', '{}'),
    (NEW.id, 'EC', 'C', 'Mercancia formal (DAI)', 'Declaracion aduanera de importacion — requiere RUC y agente de aduanas', 4, NULL, 2000.01, NULL, 'general', false, false, true, 'formal', '{}'),
    (NEW.id, 'EC', 'D', 'Mercancia peligrosa/restringida', 'Requiere permisos especiales INEN y manejo DGR', 5, NULL, NULL, NULL, 'dangerous_goods', true, false, true, 'formal', '{}')
  ON CONFLICT (organization_id, country_code, code) DO NOTHING;

  -- Required documents for B+
  SELECT id INTO cat_bplus_id FROM shipping_categories WHERE organization_id = NEW.id AND country_code = 'EC' AND code = 'B+';
  IF cat_bplus_id IS NOT NULL THEN
    INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
      (cat_bplus_id, 'commercial_invoice', 'Factura Comercial', true),
      (cat_bplus_id, 'packing_list', 'Lista de Empaque', true);
  END IF;

  -- Required documents for C
  SELECT id INTO cat_c_id FROM shipping_categories WHERE organization_id = NEW.id AND country_code = 'EC' AND code = 'C';
  IF cat_c_id IS NOT NULL THEN
    INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
      (cat_c_id, 'commercial_invoice', 'Factura Comercial', true),
      (cat_c_id, 'packing_list', 'Lista de Empaque', true),
      (cat_c_id, 'power_of_attorney', 'Poder de Autorizacion', true);
  END IF;

  -- Required documents for D
  SELECT id INTO cat_d_id FROM shipping_categories WHERE organization_id = NEW.id AND country_code = 'EC' AND code = 'D';
  IF cat_d_id IS NOT NULL THEN
    INSERT INTO shipping_category_required_documents (shipping_category_id, document_type, label, is_required) VALUES
      (cat_d_id, 'commercial_invoice', 'Factura Comercial', true),
      (cat_d_id, 'packing_list', 'Lista de Empaque', true),
      (cat_d_id, 'inen_certificate', 'Certificado INEN', true),
      (cat_d_id, 'special_permit', 'Permiso Especial', true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
