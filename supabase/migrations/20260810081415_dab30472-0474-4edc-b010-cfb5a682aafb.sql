DROP FUNCTION IF EXISTS public.get_all_profiles_admin();
CREATE FUNCTION public.get_all_profiles_admin()
 RETURNS TABLE(id uuid, email text, full_name text, created_at timestamp with time zone, role app_role, approved boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.created_at,
           COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1), 'user'::app_role),
           EXISTS (SELECT 1 FROM public.approved_users au WHERE au.user_id = p.id)
    FROM public.profiles p
    ORDER BY p.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_all_profiles_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_profiles_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_approval(_user_id uuid, _approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  IF _approved THEN
    INSERT INTO public.approved_users (user_id, approved_by)
    VALUES (_user_id, auth.uid())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    IF _user_id = auth.uid() THEN
      RAISE EXCEPTION 'Cannot revoke your own access';
    END IF;
    DELETE FROM public.approved_users WHERE user_id = _user_id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_user_approval(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_approval(uuid, boolean) TO authenticated;