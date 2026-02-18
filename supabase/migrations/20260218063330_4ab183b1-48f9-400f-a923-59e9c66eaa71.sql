-- Add fabric_width column to orders table (used by the app but missing from DB)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fabric_width numeric NULL DEFAULT 145;