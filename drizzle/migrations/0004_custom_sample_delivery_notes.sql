ALTER TABLE public.sample_dispatches ADD COLUMN note_description text;
CREATE TABLE public.custom_sample_delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_pass_no text NOT NULL UNIQUE,
  sent_to text NOT NULL,
  mobile text,
  qty numeric NOT NULL DEFAULT 1 CHECK (qty > 0),
  purpose text,
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_return date,
  dispatched_by text,
  reason text,
  note_description text NOT NULL CHECK (length(trim(note_description)) > 0),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_sample_delivery_notes TO authenticated;
GRANT ALL ON public.custom_sample_delivery_notes TO service_role;
ALTER TABLE public.custom_sample_delivery_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users manage custom sample notes" ON public.custom_sample_delivery_notes FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE TRIGGER update_custom_sample_notes_updated_at BEFORE UPDATE ON public.custom_sample_delivery_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_custom_sample_notes_created ON public.custom_sample_delivery_notes(created_at DESC);