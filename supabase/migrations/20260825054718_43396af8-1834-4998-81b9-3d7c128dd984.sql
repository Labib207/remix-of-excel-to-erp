CREATE TABLE public.stationery_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_code text NOT NULL,
  description text NOT NULL,
  uom text NOT NULL DEFAULT 'pcs',
  opening_stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  sort_order integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stationery_items TO authenticated;
GRANT ALL ON public.stationery_items TO service_role;

ALTER TABLE public.stationery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can manage stationery items"
ON public.stationery_items
FOR ALL
TO authenticated
USING (public.is_approved(auth.uid()))
WITH CHECK (public.is_approved(auth.uid()));

CREATE TRIGGER update_stationery_items_updated_at
BEFORE UPDATE ON public.stationery_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.stationery_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.stationery_items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out')),
  qty numeric NOT NULL CHECK (qty > 0),
  trans_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stationery_transactions TO authenticated;
GRANT ALL ON public.stationery_transactions TO service_role;

ALTER TABLE public.stationery_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can manage stationery transactions"
ON public.stationery_transactions
FOR ALL
TO authenticated
USING (public.is_approved(auth.uid()))
WITH CHECK (public.is_approved(auth.uid()));

CREATE TRIGGER update_stationery_transactions_updated_at
BEFORE UPDATE ON public.stationery_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_stationery_transactions_item_id ON public.stationery_transactions(item_id);
CREATE INDEX idx_stationery_transactions_trans_date ON public.stationery_transactions(trans_date DESC);