CREATE OR REPLACE FUNCTION public.validate_ferias()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_fim < NEW.data_inicio THEN
    RAISE EXCEPTION 'Data de término deve ser maior ou igual à data de início';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_ferias() FROM PUBLIC, anon, authenticated;