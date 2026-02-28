
-- Create damage_recutting table
CREATE TABLE public.damage_recutting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  size_code TEXT NOT NULL,
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  marker_length NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'yards',
  fabric_usage NUMERIC GENERATED ALWAYS AS (marker_length * quantity) STORED,
  reason TEXT,
  line_no TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.damage_recutting ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view damage_recutting"
  ON public.damage_recutting FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert damage_recutting"
  ON public.damage_recutting FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update damage_recutting"
  ON public.damage_recutting FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete damage_recutting"
  ON public.damage_recutting FOR DELETE USING (true);

-- Updated_at trigger
CREATE TRIGGER update_damage_recutting_updated_at
  BEFORE UPDATE ON public.damage_recutting
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
