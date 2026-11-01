ALTER TABLE public.material_catalog DROP CONSTRAINT IF EXISTS material_catalog_item_code_key;
CREATE INDEX IF NOT EXISTS idx_material_catalog_item_code ON public.material_catalog (item_code);