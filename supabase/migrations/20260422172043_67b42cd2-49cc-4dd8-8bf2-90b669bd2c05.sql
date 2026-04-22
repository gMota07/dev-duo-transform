ALTER TABLE public.demandas DROP CONSTRAINT IF EXISTS demandas_solicitante_id_fkey;
ALTER TABLE public.demandas DROP CONSTRAINT IF EXISTS demandas_responsavel_id_fkey;

ALTER TABLE public.demandas
  ADD CONSTRAINT demandas_solicitante_id_fkey
  FOREIGN KEY (solicitante_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.demandas
  ADD CONSTRAINT demandas_responsavel_id_fkey
  FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';