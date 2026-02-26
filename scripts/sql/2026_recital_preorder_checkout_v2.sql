-- v2 checkout schema for recital preorder products + orders

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.recital_preorder_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  taxable BOOLEAN NOT NULL DEFAULT false,
  xero_account_code TEXT NOT NULL,
  xero_tax_type TEXT NOT NULL DEFAULT 'NONE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recital_checkout_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number BIGSERIAL UNIQUE,

  customer_type TEXT NOT NULL CHECK (customer_type IN ('akada', 'guest')),
  payment_option TEXT NOT NULL CHECK (payment_option IN ('charge_account', 'pay_now')),
  akada_charge_authorized BOOLEAN NOT NULL DEFAULT false,

  parent_first_name TEXT NOT NULL,
  parent_last_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT NOT NULL,

  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  sales_tax_rate NUMERIC(8,6) NOT NULL DEFAULT 0,
  callout_tier TEXT CHECK (callout_tier IN ('quarter','half','full')),
  callout_message TEXT,

  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'queued_for_xero', 'paid', 'failed', 'canceled')),

  xero_sync_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (xero_sync_status IN ('not_configured', 'pending', 'synced', 'failed')),
  xero_invoice_id TEXT,
  xero_payment_url TEXT,
  xero_last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recital_checkout_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.recital_checkout_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.recital_preorder_products(id) ON DELETE SET NULL,

  product_name TEXT NOT NULL,
  product_description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  taxable BOOLEAN NOT NULL DEFAULT false,
  xero_account_code TEXT NOT NULL,
  xero_tax_type TEXT NOT NULL,

  line_subtotal_cents INTEGER NOT NULL CHECK (line_subtotal_cents >= 0),
  line_tax_cents INTEGER NOT NULL CHECK (line_tax_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recital_preorder_products_active_sort
  ON public.recital_preorder_products(is_active, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recital_checkout_orders_created_at
  ON public.recital_checkout_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recital_checkout_orders_email
  ON public.recital_checkout_orders(parent_email);

CREATE INDEX IF NOT EXISTS idx_recital_checkout_order_items_order_id
  ON public.recital_checkout_order_items(order_id);

CREATE OR REPLACE FUNCTION set_recital_checkout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recital_products_updated_at ON public.recital_preorder_products;
CREATE TRIGGER trg_recital_products_updated_at
BEFORE UPDATE ON public.recital_preorder_products
FOR EACH ROW
EXECUTE FUNCTION set_recital_checkout_updated_at();

DROP TRIGGER IF EXISTS trg_recital_orders_updated_at ON public.recital_checkout_orders;
CREATE TRIGGER trg_recital_orders_updated_at
BEFORE UPDATE ON public.recital_checkout_orders
FOR EACH ROW
EXECUTE FUNCTION set_recital_checkout_updated_at();

-- Optional initial seed products. Safe to re-run.
INSERT INTO public.recital_preorder_products (name, description, image_url, price_cents, taxable, xero_account_code, xero_tax_type, sort_order)
SELECT 'Yearbook', '2026 recital yearbook keepsake.', NULL, 2000, true, 'Yearbook', 'OUTPUT', 10
WHERE NOT EXISTS (
  SELECT 1 FROM public.recital_preorder_products WHERE lower(name) = 'yearbook'
);

INSERT INTO public.recital_preorder_products (name, description, image_url, price_cents, taxable, xero_account_code, xero_tax_type, sort_order)
SELECT 'Dancer Congratulations', 'Custom callout printed for your dancer.', NULL, 2500, false, 'Callouts', 'NONE', 20
WHERE NOT EXISTS (
  SELECT 1 FROM public.recital_preorder_products WHERE lower(name) = 'dancer congratulations'
);

CREATE TABLE IF NOT EXISTS public.recital_checkout_order_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.recital_checkout_orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  mime_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recital_checkout_order_assets_order_id
  ON public.recital_checkout_order_assets(order_id);
