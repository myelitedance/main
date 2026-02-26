ALTER TABLE public.recital_checkout_orders
  ADD COLUMN IF NOT EXISTS callout_tier TEXT CHECK (callout_tier IN ('quarter','half','full')),
  ADD COLUMN IF NOT EXISTS callout_message TEXT;

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
