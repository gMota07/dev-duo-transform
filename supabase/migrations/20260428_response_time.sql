-- ============================================
-- RESPONSE TIME CALCULATION
-- ============================================

-- Adicionar colunas para rastrear tempo de resposta
ALTER TABLE public.demandas
ADD COLUMN tempo_resposta_segundos INT,
ADD COLUMN tempo_resposta_calculado_em TIMESTAMPTZ;

-- Comentário explicativo
COMMENT ON COLUMN public.demandas.tempo_resposta_segundos IS 'Tempo em segundos entre quando a demanda foi criada (aberto) até a primeira mudança de status (deixou de ser aberto)';
COMMENT ON COLUMN public.demandas.tempo_resposta_calculado_em IS 'Timestamp de quando o tempo de resposta foi calculado (não muda mais depois)';

-- Criar trigger para calcular tempo de resposta
CREATE OR REPLACE FUNCTION public.calculate_response_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o status está mudando de "aberto" para algo diferente
  -- E se ainda não foi calculado o tempo de resposta
  IF OLD.status = 'aberto' 
     AND NEW.status != 'aberto' 
     AND NEW.tempo_resposta_calculado_em IS NULL 
  THEN
    -- Calcular tempo em segundos
    NEW.tempo_resposta_segundos := EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INT;
    NEW.tempo_resposta_calculado_em := NOW();
  ELSE
    -- Se o tempo já foi calculado, não mudar mais
    IF OLD.tempo_resposta_calculado_em IS NOT NULL THEN
      NEW.tempo_resposta_segundos := OLD.tempo_resposta_segundos;
      NEW.tempo_resposta_calculado_em := OLD.tempo_resposta_calculado_em;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS calculate_response_time ON public.demandas;
CREATE TRIGGER calculate_response_time
BEFORE UPDATE ON public.demandas
FOR EACH ROW
EXECUTE FUNCTION public.calculate_response_time();

-- Criar índice para buscas rápidas
CREATE INDEX idx_demandas_tempo_resposta ON public.demandas(tempo_resposta_segundos)
WHERE tempo_resposta_calculado_em IS NOT NULL;
