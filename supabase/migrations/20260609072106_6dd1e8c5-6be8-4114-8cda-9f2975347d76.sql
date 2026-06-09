ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS tr_number text NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid NULL;

ALTER TABLE public.requests ALTER COLUMN approval_status SET DEFAULT 'pending';

ALTER TABLE public.requests
  DROP CONSTRAINT IF EXISTS requests_approval_status_check;
ALTER TABLE public.requests
  ADD CONSTRAINT requests_approval_status_check
  CHECK (approval_status IN ('pending','approved'));