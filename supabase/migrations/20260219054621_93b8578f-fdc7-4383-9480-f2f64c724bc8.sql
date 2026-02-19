
CREATE SEQUENCE IF NOT EXISTS request_items_sort_order_seq;

ALTER TABLE public.request_items 
  ALTER COLUMN sort_order SET DEFAULT nextval('request_items_sort_order_seq');
