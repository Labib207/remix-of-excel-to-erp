
-- Create orders table (central entity)
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_no TEXT NOT NULL,
  style_no TEXT NOT NULL,
  customer TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  fabric_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create cut_plans table
CREATE TABLE public.cut_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  plan_no TEXT NOT NULL,
  fabric_type TEXT,
  fabric_width NUMERIC,
  plies INTEGER DEFAULT 0,
  total_pieces INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  planned_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create lay_sheets table
CREATE TABLE public.lay_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cut_plan_id UUID REFERENCES public.cut_plans(id) ON DELETE CASCADE,
  sheet_no TEXT NOT NULL,
  fabric_type TEXT,
  fabric_width NUMERIC,
  lay_length NUMERIC,
  plies INTEGER DEFAULT 0,
  total_pieces INTEGER DEFAULT 0,
  wastage_percent NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create marker_plans table
CREATE TABLE public.marker_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  marker_no TEXT NOT NULL,
  marker_length NUMERIC,
  marker_width NUMERIC,
  efficiency NUMERIC DEFAULT 0,
  size_combination TEXT,
  pieces_per_marker INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create bundles table
CREATE TABLE public.bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lay_sheet_id UUID REFERENCES public.lay_sheets(id) ON DELETE CASCADE,
  bundle_no TEXT NOT NULL,
  size TEXT,
  color TEXT,
  quantity INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'created',
  scanned_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create requirements table (raw material requirements)
CREATE TABLE public.requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  description TEXT,
  color TEXT,
  size TEXT,
  unit TEXT DEFAULT 'pcs',
  required_qty NUMERIC NOT NULL DEFAULT 0,
  received_qty NUMERIC DEFAULT 0,
  balance_qty NUMERIC GENERATED ALWAYS AS (required_qty - received_qty) STORED,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create requests table (material requests)
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  request_no TEXT NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  department TEXT,
  requested_by TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create request_items table
CREATE TABLE public.request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
  item_code TEXT,
  description TEXT,
  color TEXT,
  size TEXT,
  unit TEXT DEFAULT 'pcs',
  requested_qty NUMERIC NOT NULL DEFAULT 0,
  issued_qty NUMERIC DEFAULT 0,
  balance_qty NUMERIC GENERATED ALWAYS AS (requested_qty - issued_qty) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_acknowledgments table
CREATE TABLE public.delivery_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  acknowledgment_no TEXT NOT NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by TEXT,
  line_supervisor_signature TEXT,
  line_recorder_signature TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create delivery_items table
CREATE TABLE public.delivery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acknowledgment_id UUID REFERENCES public.delivery_acknowledgments(id) ON DELETE CASCADE,
  request_item_id UUID REFERENCES public.request_items(id) ON DELETE SET NULL,
  item_code TEXT,
  description TEXT,
  color TEXT,
  size TEXT,
  unit TEXT DEFAULT 'pcs',
  requirement_qty NUMERIC DEFAULT 0,
  issued_qty NUMERIC DEFAULT 0,
  balance_qty NUMERIC GENERATED ALWAYS AS (requirement_qty - issued_qty) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cut_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lay_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marker_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can access all data (team collaboration)
CREATE POLICY "Authenticated users can view all orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orders" ON public.orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete orders" ON public.orders FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all cut_plans" ON public.cut_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cut_plans" ON public.cut_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cut_plans" ON public.cut_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cut_plans" ON public.cut_plans FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all lay_sheets" ON public.lay_sheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lay_sheets" ON public.lay_sheets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lay_sheets" ON public.lay_sheets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete lay_sheets" ON public.lay_sheets FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all marker_plans" ON public.marker_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert marker_plans" ON public.marker_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update marker_plans" ON public.marker_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete marker_plans" ON public.marker_plans FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all bundles" ON public.bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bundles" ON public.bundles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bundles" ON public.bundles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete bundles" ON public.bundles FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all requirements" ON public.requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert requirements" ON public.requirements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update requirements" ON public.requirements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete requirements" ON public.requirements FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all requests" ON public.requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert requests" ON public.requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update requests" ON public.requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete requests" ON public.requests FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all request_items" ON public.request_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert request_items" ON public.request_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update request_items" ON public.request_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete request_items" ON public.request_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all delivery_acknowledgments" ON public.delivery_acknowledgments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert delivery_acknowledgments" ON public.delivery_acknowledgments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update delivery_acknowledgments" ON public.delivery_acknowledgments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete delivery_acknowledgments" ON public.delivery_acknowledgments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all delivery_items" ON public.delivery_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert delivery_items" ON public.delivery_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update delivery_items" ON public.delivery_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete delivery_items" ON public.delivery_items FOR DELETE TO authenticated USING (true);

-- Create updated_at triggers for all tables
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cut_plans_updated_at BEFORE UPDATE ON public.cut_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lay_sheets_updated_at BEFORE UPDATE ON public.lay_sheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marker_plans_updated_at BEFORE UPDATE ON public.marker_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bundles_updated_at BEFORE UPDATE ON public.bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_request_items_updated_at BEFORE UPDATE ON public.request_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_acknowledgments_updated_at BEFORE UPDATE ON public.delivery_acknowledgments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_cut_plans_order_id ON public.cut_plans(order_id);
CREATE INDEX idx_lay_sheets_cut_plan_id ON public.lay_sheets(cut_plan_id);
CREATE INDEX idx_marker_plans_order_id ON public.marker_plans(order_id);
CREATE INDEX idx_bundles_lay_sheet_id ON public.bundles(lay_sheet_id);
CREATE INDEX idx_requirements_order_id ON public.requirements(order_id);
CREATE INDEX idx_requests_order_id ON public.requests(order_id);
CREATE INDEX idx_request_items_request_id ON public.request_items(request_id);
CREATE INDEX idx_delivery_acknowledgments_request_id ON public.delivery_acknowledgments(request_id);
CREATE INDEX idx_delivery_items_acknowledgment_id ON public.delivery_items(acknowledgment_id);
