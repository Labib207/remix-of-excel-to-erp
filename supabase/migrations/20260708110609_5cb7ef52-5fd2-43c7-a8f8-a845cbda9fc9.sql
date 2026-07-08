
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Requests
CREATE INDEX IF NOT EXISTS idx_requests_order_id        ON public.requests (order_id);
CREATE INDEX IF NOT EXISTS idx_requests_request_date    ON public.requests (request_date DESC);
CREATE INDEX IF NOT EXISTS idx_requests_approval_status ON public.requests (approval_status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at      ON public.requests (created_at DESC);

-- Request items
CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON public.request_items (request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_desc_trgm  ON public.request_items USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_request_items_code_trgm  ON public.request_items USING gin (item_code gin_trgm_ops);

-- Requirements
CREATE INDEX IF NOT EXISTS idx_requirements_order_id    ON public.requirements (order_id);

-- Delivery
CREATE INDEX IF NOT EXISTS idx_delivery_ack_request_id  ON public.delivery_acknowledgments (request_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ack_date        ON public.delivery_acknowledgments (delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_items_ack_id    ON public.delivery_items (acknowledgment_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_order_no          ON public.orders (order_no);

-- Material catalog
CREATE INDEX IF NOT EXISTS idx_material_catalog_desc_trgm ON public.material_catalog USING gin (description gin_trgm_ops);
