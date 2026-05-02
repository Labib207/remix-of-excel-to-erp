
-- Fix 1: damage_recutting policies must require authentication
DROP POLICY IF EXISTS "Authenticated users can delete damage_recutting" ON public.damage_recutting;
DROP POLICY IF EXISTS "Authenticated users can insert damage_recutting" ON public.damage_recutting;
DROP POLICY IF EXISTS "Authenticated users can update damage_recutting" ON public.damage_recutting;
DROP POLICY IF EXISTS "Authenticated users can view damage_recutting" ON public.damage_recutting;

CREATE POLICY "Authenticated users can view damage_recutting"
ON public.damage_recutting FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert damage_recutting"
ON public.damage_recutting FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update damage_recutting"
ON public.damage_recutting FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete damage_recutting"
ON public.damage_recutting FOR DELETE TO authenticated USING (true);

-- Fix 2: user_roles privilege escalation - replace ALL policy with explicit cmd policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: get_user_role should not allow lookup of arbitrary users' roles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (
      _user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
      )
    )
  LIMIT 1
$$;
