-- Extend existing xero_integration_settings with tax_type for invoice line items.

ALTER TABLE public.xero_integration_settings
  ADD COLUMN IF NOT EXISTS tax_type TEXT NOT NULL DEFAULT 'OUTPUT',
  ADD COLUMN IF NOT EXISTS yearbook_account_code TEXT NOT NULL DEFAULT 'Yearbook',
  ADD COLUMN IF NOT EXISTS callouts_account_code TEXT NOT NULL DEFAULT 'Callouts',
  ADD COLUMN IF NOT EXISTS yearbook_tax_type TEXT NOT NULL DEFAULT 'OUTPUT',
  ADD COLUMN IF NOT EXISTS callouts_tax_type TEXT NOT NULL DEFAULT 'NONE';
