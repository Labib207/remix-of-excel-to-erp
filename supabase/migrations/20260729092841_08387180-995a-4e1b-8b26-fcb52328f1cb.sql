
-- 1. Approved users allowlist
CREATE TABLE IF NOT EXISTS public.approved_users (
  user_id uuid PRIMARY KEY,
  approved_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid
);
GRANT SELECT ON public.approved_users TO authenticated;
GRANT ALL ON public.approved_users TO service_role;
ALTER TABLE public.approved_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.approved_users WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Users can view own approval" ON public.approved_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view approvals" ON public.approved_users
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert approvals" ON public.approved_users
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete approvals" ON public.approved_users
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Grandfather all existing accounts: approved + profile + admin role
INSERT INTO public.approved_users (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name' FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Replace permissive "true" policies on operational tables
DO $do$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders','requirements','requests','request_items','delivery_acknowledgments',
    'delivery_items','cut_plans','lay_sheets','bundles','bundle_guides','marker_plans',
    'damage_recutting','ratios','fabric_calculations','fabric_rolls','lay_records','material_catalog'
  ] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "Approved users can manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()))',
      t
    );
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END
$do$;

-- 4. Admin-only server-verified profile listing
CREATE OR REPLACE FUNCTION public.get_all_profiles_admin()
RETURNS TABLE (id uuid, email text, full_name text, created_at timestamptz, role app_role)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.created_at,
           COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1), 'user'::app_role)
    FROM public.profiles p
    ORDER BY p.created_at DESC;
END;
$$;

-- 5. Server-side document counters
CREATE TABLE IF NOT EXISTS public.document_counters (
  prefix text NOT NULL,
  period text NOT NULL,
  counter integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prefix, period)
);
GRANT SELECT ON public.document_counters TO authenticated;
GRANT ALL ON public.document_counters TO service_role;
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can view counters" ON public.document_counters
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_doc_number(_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text := to_char(now(), 'YYYY');
  v_prefix text := upper(regexp_replace(coalesce(_prefix,''), '[^A-Za-z0-9]', '', 'g'));
  v_counter integer;
BEGIN
  IF NOT public.is_approved(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF v_prefix = '' OR length(v_prefix) > 10 THEN
    RAISE EXCEPTION 'Invalid prefix';
  END IF;

  INSERT INTO public.document_counters (prefix, period, counter)
  VALUES (v_prefix, v_period, 1)
  ON CONFLICT (prefix, period)
  DO UPDATE SET counter = public.document_counters.counter + 1, updated_at = now()
  RETURNING counter INTO v_counter;

  RETURN v_prefix || '-' || v_period || '-' || lpad(v_counter::text, 4, '0');
END;
$$;

-- 6. Lock down internal SECURITY DEFINER helpers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_all_profiles_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_doc_number(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_profiles_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_doc_number(text) TO authenticated;
