create index if not exists idx_requests_status on public.requests (status);
create index if not exists idx_requests_submitted_at on public.requests (submitted_at desc);
create index if not exists idx_requests_tr_number on public.requests (tr_number);
create index if not exists idx_delivery_items_request_item_id on public.delivery_items (request_item_id);
create index if not exists idx_requirements_item_code on public.requirements (item_code);
create index if not exists idx_orders_customer_trgm on public.orders using gin (customer gin_trgm_ops);