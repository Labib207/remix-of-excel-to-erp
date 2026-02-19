
ALTER TABLE public.request_items ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
