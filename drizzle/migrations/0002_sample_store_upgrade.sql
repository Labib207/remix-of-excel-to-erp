ALTER TABLE public.samples
  ADD COLUMN sample_type text NOT NULL DEFAULT 'customer_sales' CHECK (sample_type IN ('fit_on','approval','customer_sales')),
  ADD COLUMN order_id uuid REFERENCES public.customer_orders(id) ON DELETE SET NULL,
  ADD COLUMN size text,
  ADD COLUMN color text,
  ADD COLUMN status text NOT NULL DEFAULT 'waiting_approval' CHECK (status IN ('waiting_approval','approved','rejected','sent','returned','disposed')),
  ADD COLUMN status_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN made_date date DEFAULT CURRENT_DATE,
  ADD COLUMN keep_until date,
  ADD COLUMN final_action text CHECK (final_action IN ('keep','send','reuse','dispose')),
  ADD COLUMN golden boolean NOT NULL DEFAULT false,
  ADD COLUMN photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN remarks text;

CREATE INDEX idx_samples_order ON public.samples(order_id);
CREATE INDEX idx_samples_status ON public.samples(status);

ALTER TABLE public.sample_dispatches
  ADD COLUMN pass_type text NOT NULL DEFAULT 'sent' CHECK (pass_type IN ('sent','returned','disposed')),
  ADD COLUMN reason text,
  ADD COLUMN prev_status text;

CREATE TABLE public.sample_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by uuid DEFAULT auth.uid(),
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sample_history TO authenticated;
GRANT ALL ON public.sample_history TO service_role;
ALTER TABLE public.sample_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users read sample history" ON public.sample_history FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Approved users add sample history" ON public.sample_history FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()));
CREATE INDEX idx_sample_history_sample ON public.sample_history(sample_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_sample_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  _diff jsonb := '{}'::jsonb;
  _k text;
  _new jsonb;
  _old jsonb;
  _email text;
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sample_history (sample_id, action, changes, changed_by_email)
    VALUES (NEW.id, 'created', jsonb_build_object('status', NEW.status), _email);
    RETURN NEW;
  END IF;
  _new := to_jsonb(NEW) - 'updated_at' - 'status_changed_at';
  _old := to_jsonb(OLD) - 'updated_at' - 'status_changed_at';
  FOR _k IN SELECT jsonb_object_keys(_new) LOOP
    IF _new->_k IS DISTINCT FROM _old->_k THEN
      _diff := _diff || jsonb_build_object(_k, jsonb_build_object('from', _old->_k, 'to', _new->_k));
    END IF;
  END LOOP;
  IF _diff <> '{}'::jsonb THEN
    INSERT INTO public.sample_history (sample_id, action, changes, changed_by_email)
    VALUES (NEW.id, 'updated', _diff, _email);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sample_status_changed()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.status_changed_at := now(); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER samples_status_changed BEFORE UPDATE ON public.samples FOR EACH ROW EXECUTE FUNCTION public.set_sample_status_changed();
CREATE TRIGGER samples_history_log AFTER INSERT OR UPDATE ON public.samples FOR EACH ROW EXECUTE FUNCTION public.log_sample_change();

CREATE POLICY "Approved users read sample photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sample-photos' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved users upload sample photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sample-photos' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved users delete sample photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sample-photos' AND public.is_approved(auth.uid()));