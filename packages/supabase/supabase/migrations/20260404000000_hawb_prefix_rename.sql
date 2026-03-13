-- Change HAWB number prefix from GLP to HAWB

-- Update the main house bill number function
CREATE OR REPLACE FUNCTION next_house_bill_number(p_org_id uuid, p_doc_type text DEFAULT 'hawb')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  next_num int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('house_bill_' || p_doc_type || '_' || p_org_id::text));

  CASE p_doc_type
    WHEN 'hawb' THEN v_prefix := 'HAWB';
    WHEN 'hbl'  THEN v_prefix := 'HBL';
    WHEN 'hwb'  THEN v_prefix := 'HWB';
    ELSE v_prefix := 'HAWB';
  END CASE;

  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(hawb_number, '[^0-9]', '', 'g'), '')::int),
    0
  ) + 1 INTO next_num
  FROM hawbs
  WHERE organization_id = p_org_id AND document_type = p_doc_type;

  RETURN v_prefix || lpad(next_num::text, 5, '0');
END;
$$;

-- Update the backward-compatible wrapper
CREATE OR REPLACE FUNCTION next_hawb_number(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN next_house_bill_number(p_org_id, 'hawb');
END;
$$;

-- Rename existing GLP-prefixed HAWB numbers to HAWB prefix
UPDATE hawbs
SET hawb_number = 'HAWB' || substring(hawb_number from 4)
WHERE hawb_number LIKE 'GLP%';
