-- Add Xero payment link + error columns to existing recital_preorders table.
-- Safe to run multiple times.

ALTER TABLE public.recital_preorders
  ADD COLUMN IF NOT EXISTS xero_payment_url TEXT,
  ADD COLUMN IF NOT EXISTS xero_last_error TEXT;
