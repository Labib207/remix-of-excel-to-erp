
-- Add JSONB columns to orders table for complex data structures
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS style_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shade TEXT DEFAULT 'X';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS size_quantities JSONB DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS custom_sizes JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Add JSONB columns to cut_plans for size quantities and marker reference
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS marker_id UUID;
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS cut_no INTEGER DEFAULT 1;
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS shade TEXT DEFAULT 'X';
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS marker_length NUMERIC;
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS lay_length NUMERIC;
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '{}';
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS total_qty INTEGER DEFAULT 0;
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS fabric_used NUMERIC DEFAULT 0;
ALTER TABLE public.cut_plans ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Add columns to marker_plans for size distribution
ALTER TABLE public.marker_plans ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '{}';

-- Create ratios table
CREATE TABLE IF NOT EXISTS public.ratios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  ratio_number INTEGER DEFAULT 1,
  ratio_name TEXT,
  sizes JSONB DEFAULT '{}',
  planned_qty JSONB DEFAULT '{}',
  plies INTEGER DEFAULT 0,
  total_qty INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create fabric_calculations table
CREATE TABLE IF NOT EXISTS public.fabric_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  fabric_type TEXT NOT NULL,
  total_meters NUMERIC DEFAULT 0,
  total_yards NUMERIC DEFAULT 0,
  wastage_percent NUMERIC DEFAULT 1,
  request_with_allowance NUMERIC DEFAULT 0,
  received_meters NUMERIC DEFAULT 0,
  used_meters NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create fabric_rolls table
CREATE TABLE IF NOT EXISTS public.fabric_rolls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roll_no TEXT NOT NULL,
  fabric_type TEXT NOT NULL,
  system_length NUMERIC DEFAULT 0,
  received_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create lay_records table for reconciliation
CREATE TABLE IF NOT EXISTS public.lay_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cut_plan_id UUID REFERENCES public.cut_plans(id) ON DELETE CASCADE,
  cut_no INTEGER,
  shade TEXT,
  roll_no TEXT,
  roll_id UUID,
  system_roll_length NUMERIC DEFAULT 0,
  actual_lays INTEGER DEFAULT 0,
  marker_length NUMERIC DEFAULT 0,
  layed_mts NUMERIC DEFAULT 0,
  overlap_yards NUMERIC DEFAULT 0,
  roll_shortage_increase NUMERIC DEFAULT 0,
  roll_end_next_ply_1st NUMERIC DEFAULT 0,
  damage NUMERIC DEFAULT 0,
  roll_end_next_ply_2nd NUMERIC DEFAULT 0,
  recut_return NUMERIC DEFAULT 0,
  unusable_roll_end NUMERIC DEFAULT 0,
  total_usage NUMERIC DEFAULT 0,
  roll_end NUMERIC DEFAULT 0,
  big_end NUMERIC DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create bundle_guides table
CREATE TABLE IF NOT EXISTS public.bundle_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cut_plan_id UUID REFERENCES public.cut_plans(id) ON DELETE CASCADE,
  size TEXT,
  total_qty INTEGER DEFAULT 0,
  bundles INTEGER DEFAULT 0,
  bundle_size INTEGER DEFAULT 0,
  remainder_qty INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create material_catalog table
CREATE TABLE IF NOT EXISTS public.material_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  uom TEXT DEFAULT 'pcs',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add bundle tracking fields to bundles table
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS cut_plan_id UUID REFERENCES public.cut_plans(id) ON DELETE CASCADE;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS part TEXT;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS start_no INTEGER;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS end_no INTEGER;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS serial_range TEXT;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS ply_start INTEGER;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS ply_end INTEGER;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS shade TEXT;
ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS cut_no INTEGER;

-- Enable RLS on new tables
ALTER TABLE public.ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lay_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_catalog ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Authenticated users can manage ratios" ON public.ratios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage fabric_calculations" ON public.fabric_calculations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage fabric_rolls" ON public.fabric_rolls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage lay_records" ON public.lay_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage bundle_guides" ON public.bundle_guides FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage material_catalog" ON public.material_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_ratios_updated_at BEFORE UPDATE ON public.ratios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fabric_calculations_updated_at BEFORE UPDATE ON public.fabric_calculations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fabric_rolls_updated_at BEFORE UPDATE ON public.fabric_rolls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lay_records_updated_at BEFORE UPDATE ON public.lay_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_ratios_order_id ON public.ratios(order_id);
CREATE INDEX IF NOT EXISTS idx_fabric_calculations_order_id ON public.fabric_calculations(order_id);
CREATE INDEX IF NOT EXISTS idx_lay_records_cut_plan_id ON public.lay_records(cut_plan_id);
CREATE INDEX IF NOT EXISTS idx_bundle_guides_cut_plan_id ON public.bundle_guides(cut_plan_id);
