-- Tabela de escala diária (permite múltiplos turnos no mesmo dia)
CREATE TABLE public.escalas_dia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  ordem SMALLINT NOT NULL DEFAULT 1,
  hora_inicio TIME,
  hora_fim TIME,
  local TEXT,
  observacao TEXT,
  ausente BOOLEAN NOT NULL DEFAULT false,
  tipo_ausencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, data, ordem)
);

CREATE INDEX idx_escalas_dia_user_data ON public.escalas_dia(user_id, data);
CREATE INDEX idx_escalas_dia_data ON public.escalas_dia(data);

ALTER TABLE public.escalas_dia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own escalas" ON public.escalas_dia
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own escalas" ON public.escalas_dia
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own escalas" ON public.escalas_dia
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own escalas" ON public.escalas_dia
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins view all escalas" ON public.escalas_dia
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert escalas" ON public.escalas_dia
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update escalas" ON public.escalas_dia
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete escalas" ON public.escalas_dia
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_escalas_dia_updated
  BEFORE UPDATE ON public.escalas_dia
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela de férias (até 4 períodos por ano)
CREATE TABLE public.ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ano INT NOT NULL,
  periodo SMALLINT NOT NULL CHECK (periodo BETWEEN 1 AND 4),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ano, periodo)
);

CREATE INDEX idx_ferias_user ON public.ferias(user_id);
CREATE INDEX idx_ferias_periodo ON public.ferias(data_inicio, data_fim);

-- Trigger de validação (data_fim >= data_inicio) — usar trigger em vez de CHECK
CREATE OR REPLACE FUNCTION public.validate_ferias()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.data_fim < NEW.data_inicio THEN
    RAISE EXCEPTION 'Data de término deve ser maior ou igual à data de início';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ferias_validate
  BEFORE INSERT OR UPDATE ON public.ferias
  FOR EACH ROW EXECUTE FUNCTION public.validate_ferias();

CREATE TRIGGER trg_ferias_updated
  BEFORE UPDATE ON public.ferias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ferias" ON public.ferias
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ferias" ON public.ferias
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ferias" ON public.ferias
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own ferias" ON public.ferias
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins view all ferias" ON public.ferias
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert ferias" ON public.ferias
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update ferias" ON public.ferias
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete ferias" ON public.ferias
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));