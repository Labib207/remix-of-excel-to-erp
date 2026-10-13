ALTER TABLE public.samples DROP CONSTRAINT samples_sample_type_check;
ALTER TABLE public.samples ADD CONSTRAINT samples_sample_type_check CHECK (sample_type IN ('fit_on','pp_sample','production','approval','customer_sales'));
COMMENT ON CONSTRAINT samples_sample_type_check ON public.samples IS 'Sample types extended with pp_sample and production';