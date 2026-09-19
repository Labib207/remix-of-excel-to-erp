ALTER TABLE public.stationery_transactions
  ADD COLUMN handover_id uuid,
  ADD COLUMN handover_number text,
  ADD COLUMN handover_by text,
  ADD COLUMN handover_to text;

CREATE INDEX idx_stationery_transactions_handover_id
  ON public.stationery_transactions(handover_id)
  WHERE handover_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_stationery_handover(
  _handover_id uuid,
  _handover_number text,
  _trans_date date,
  _reference text,
  _notes text,
  _handover_by text,
  _handover_to text,
  _items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _entry jsonb;
  _item_id uuid;
  _qty numeric;
  _balance numeric;
BEGIN
  IF NOT public.is_approved(auth.uid()) THEN
    RAISE EXCEPTION 'Account approval is required';
  END IF;

  IF _handover_number IS NULL OR btrim(_handover_number) = '' THEN
    RAISE EXCEPTION 'Handover number is required';
  END IF;

  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  FOR _entry IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    _item_id := (_entry->>'item_id')::uuid;
    _qty := (_entry->>'qty')::numeric;

    IF _qty IS NULL OR _qty <= 0 THEN
      RAISE EXCEPTION 'Every quantity must be greater than zero';
    END IF;

    PERFORM id FROM public.stationery_items WHERE id = _item_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stationery item not found';
    END IF;

    SELECT si.opening_stock
      + COALESCE(SUM(CASE WHEN st.type = 'in' THEN st.qty ELSE -st.qty END), 0)
    INTO _balance
    FROM public.stationery_items si
    LEFT JOIN public.stationery_transactions st ON st.item_id = si.id
    WHERE si.id = _item_id
    GROUP BY si.id, si.opening_stock;

    IF _qty > _balance THEN
      RAISE EXCEPTION 'Insufficient stationery stock';
    END IF;

    INSERT INTO public.stationery_transactions (
      item_id, type, qty, trans_date, reference, notes, created_by,
      handover_id, handover_number, handover_by, handover_to
    ) VALUES (
      _item_id, 'out', _qty, _trans_date, NULLIF(btrim(_reference), ''),
      NULLIF(btrim(_notes), ''), auth.uid(), _handover_id,
      _handover_number, NULLIF(btrim(_handover_by), ''), NULLIF(btrim(_handover_to), '')
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.create_stationery_handover(uuid, text, date, text, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_stationery_handover(uuid, text, date, text, text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_stationery_handover(uuid, text, date, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_stationery_handover(uuid, text, date, text, text, text, text, jsonb) TO service_role;