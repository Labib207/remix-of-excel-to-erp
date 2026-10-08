CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text,
  company text,
  address text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

CREATE TABLE public.customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  mobile text,
  style text,
  quantity numeric NOT NULL DEFAULT 0,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  deadline date,
  remarks text,
  current_stage integer NOT NULL DEFAULT 0,
  stage_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_date date,
  received_by text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_orders TO authenticated;
GRANT ALL ON public.customer_orders TO service_role;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users manage customer orders" ON public.customer_orders FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE INDEX idx_customer_orders_customer ON public.customer_orders(customer_id);

CREATE TABLE public.samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text NOT NULL UNIQUE,
  style_name text NOT NULL,
  description text,
  location text,
  total_qty numeric NOT NULL DEFAULT 1,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.samples TO authenticated;
GRANT ALL ON public.samples TO service_role;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users manage samples" ON public.samples FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

CREATE TABLE public.sample_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_pass_no text NOT NULL,
  sample_id uuid NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sent_to text NOT NULL,
  mobile text,
  qty numeric NOT NULL DEFAULT 1 CHECK (qty > 0),
  purpose text,
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_return date,
  dispatched_by text,
  status text NOT NULL DEFAULT 'out' CHECK (status IN ('out','returned','kept')),
  return_date date,
  returned_by text,
  return_condition text,
  return_remarks text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sample_dispatches TO authenticated;
GRANT ALL ON public.sample_dispatches TO service_role;
ALTER TABLE public.sample_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users manage sample dispatches" ON public.sample_dispatches FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE INDEX idx_sample_dispatches_sample ON public.sample_dispatches(sample_id);

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_orders_updated_at BEFORE UPDATE ON public.customer_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON public.samples FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sample_dispatches_updated_at BEFORE UPDATE ON public.sample_dispatches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();