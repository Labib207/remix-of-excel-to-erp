-- Add sort_order column to requirements table to preserve entry sequence
ALTER TABLE public.requirements ADD COLUMN sort_order integer;

-- Backfill existing rows: assign sort_order based on created_at within each order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.requirements
)
UPDATE public.requirements r
SET sort_order = n.rn
FROM numbered n
WHERE r.id = n.id;