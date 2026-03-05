-- ============================================================================
-- Rename company_admin role to forwarder_admin
-- ============================================================================

-- 1. Update existing rows
UPDATE user_roles SET role = 'forwarder_admin' WHERE role = 'company_admin';

-- 2. Update CHECK constraint to use forwarder_admin instead of company_admin
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN (
  'super_admin', 'forwarder_admin', 'warehouse_admin', 'warehouse_operator',
  'shipping_clerk', 'destination_admin', 'destination_operator', 'agency'
));
