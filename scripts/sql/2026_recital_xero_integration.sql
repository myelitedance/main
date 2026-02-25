-- Xero integration settings (single-row table)
-- Run once on each Neon branch DB used by the app.

CREATE TABLE IF NOT EXISTS public.xero_integration_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  tenant_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  sales_account_code TEXT NOT NULL DEFAULT '4715',
  tax_type TEXT NOT NULL DEFAULT 'OUTPUT',
  yearbook_account_code TEXT NOT NULL DEFAULT '4715',
  callouts_account_code TEXT NOT NULL DEFAULT '4715',
  yearbook_tax_type TEXT NOT NULL DEFAULT 'OUTPUT',
  callouts_tax_type TEXT NOT NULL DEFAULT 'NONE',
  connected_by_email TEXT,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.xero_integration_settings
  ADD COLUMN IF NOT EXISTS tax_type TEXT NOT NULL DEFAULT 'OUTPUT',
  ADD COLUMN IF NOT EXISTS yearbook_account_code TEXT NOT NULL DEFAULT '4715',
  ADD COLUMN IF NOT EXISTS callouts_account_code TEXT NOT NULL DEFAULT '4715',
  ADD COLUMN IF NOT EXISTS yearbook_tax_type TEXT NOT NULL DEFAULT 'OUTPUT',
  ADD COLUMN IF NOT EXISTS callouts_tax_type TEXT NOT NULL DEFAULT 'NONE';

-- Ensure legacy rows collapse to one row if table existed without PK enforcement.
DELETE FROM public.xero_integration_settings a
USING public.xero_integration_settings b
WHERE a.ctid < b.ctid AND a.id = b.id;

CREATE OR REPLACE FUNCTION set_xero_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_xero_settings_updated_at ON public.xero_integration_settings;
CREATE TRIGGER trg_set_xero_settings_updated_at
BEFORE UPDATE ON public.xero_integration_settings
FOR EACH ROW
EXECUTE FUNCTION set_xero_settings_updated_at();
