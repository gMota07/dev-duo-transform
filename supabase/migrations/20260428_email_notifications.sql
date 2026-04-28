-- ============================================
-- EMAIL NOTIFICATIONS SYSTEM
-- ============================================

-- Criar tabela para rastrear e-mails enviados (evitar duplicatas)
CREATE TABLE public.demanda_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  destinatario_email TEXT NOT NULL,
  tipo_notificacao TEXT NOT NULL, -- 'em_andamento', 'concluida', 'cancelada'
  status_demanda_trigger public.demanda_status NOT NULL,
  assunto TEXT NOT NULL,
  corpo_email TEXT NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  erro_envio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_email_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_email_log_demanda ON public.demanda_email_log(demanda_id);
CREATE INDEX idx_email_log_tipo ON public.demanda_email_log(tipo_notificacao);

-- Trigger para registrar no histórico quando há mudança de status
CREATE OR REPLACE FUNCTION public.trigger_demanda_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitante_email TEXT;
  v_solicitante_nome TEXT;
BEGIN
  -- Se o status mudou, registra no histórico
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Obter dados do solicitante
    SELECT email, nome INTO v_solicitante_email, v_solicitante_nome
    FROM public.profiles
    WHERE id = NEW.solicitante_id;

    -- Registrar no histórico
    INSERT INTO public.demanda_historico (
      demanda_id,
      user_id,
      acao,
      status_anterior,
      status_novo,
      observacao
    ) VALUES (
      NEW.id,
      COALESCE(NEW.responsavel_id, NEW.solicitante_id),
      'status_alterado',
      OLD.status,
      NEW.status,
      'Status alterado de ' || OLD.status || ' para ' || NEW.status
    );

    -- Chamar edge function para enviar e-mail
    -- Usar http para chamar a função sem bloquear a transação
    PERFORM http_post(
      'http://localhost:3000/functions/v1/send-demand-email',
      jsonb_build_object(
        'demanda_id', NEW.id,
        'titulo', NEW.titulo,
        'descricao', NEW.descricao,
        'status_novo', NEW.status,
        'status_anterior', OLD.status,
        'solicitante_id', NEW.solicitante_id,
        'solicitante_email', v_solicitante_email,
        'solicitante_nome', v_solicitante_nome,
        'updated_at', NEW.updated_at
      ),
      'application/json',
      'POST'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_demanda_status_change ON public.demandas;
CREATE TRIGGER trigger_demanda_status_change
AFTER UPDATE ON public.demandas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_demanda_status_change();
