-- 2026 recital preorder schema
-- Run this in Neon before using /2026recital/preorder.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.recital_preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  parent_first_name TEXT NOT NULL,
  parent_last_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT NOT NULL,

  dancer_first_name TEXT NOT NULL,
  dancer_last_name TEXT NOT NULL,

  yearbook_requested BOOLEAN NOT NULL DEFAULT FALSE,
  congrats_size TEXT NOT NULL DEFAULT 'none'
    CHECK (congrats_size IN ('none', 'quarter', 'half', 'full')),
  congrats_message TEXT,
  congrats_message_max INTEGER NOT NULL DEFAULT 0,

  yearbook_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (yearbook_amount_cents >= 0),
  congrats_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (congrats_amount_cents >= 0),
  total_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_amount_cents >= 0),

  payment_option TEXT NOT NULL
    CHECK (payment_option IN ('charge_account', 'pay_now')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'queued_for_xero', 'paid', 'failed', 'canceled')),

  xero_sync_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (xero_sync_status IN ('not_configured', 'pending', 'synced', 'failed')),
  xero_invoice_id TEXT,
  xero_payment_url TEXT,
  xero_last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (yearbook_requested = TRUE OR congrats_size <> 'none'),

  CHECK (
    (congrats_size = 'none' AND COALESCE(LENGTH(congrats_message), 0) = 0)
    OR
    (congrats_size = 'quarter' AND LENGTH(COALESCE(congrats_message, '')) BETWEEN 1 AND 120)
    OR
    (congrats_size = 'half' AND LENGTH(COALESCE(congrats_message, '')) BETWEEN 1 AND 240)
    OR
    (congrats_size = 'full' AND LENGTH(COALESCE(congrats_message, '')) BETWEEN 1 AND 500)
  )
);

CREATE TABLE IF NOT EXISTS public.recital_preorder_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preorder_id UUID NOT NULL REFERENCES public.recital_preorders(id) ON DELETE CASCADE,

  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  mime_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recital_preorders_created_at
  ON public.recital_preorders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recital_preorders_parent_email
  ON public.recital_preorders(parent_email);

CREATE INDEX IF NOT EXISTS idx_recital_preorder_photos_preorder_id
  ON public.recital_preorder_photos(preorder_id);

CREATE OR REPLACE FUNCTION set_recital_preorders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_recital_preorders_updated_at ON public.recital_preorders;
CREATE TRIGGER trg_set_recital_preorders_updated_at
BEFORE UPDATE ON public.recital_preorders
FOR EACH ROW
EXECUTE FUNCTION set_recital_preorders_updated_at();
