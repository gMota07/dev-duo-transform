import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Interface para dados de notificação de demanda
 */
export interface DemandaNotificationData {
  demanda_id: string;
  titulo: string;
  descricao: string;
  status_novo: "em_execucao" | "concluido" | "cancelado" | "impedido" | "aberto";
  status_anterior: "em_execucao" | "concluido" | "cancelado" | "impedido" | "aberto";
  solicitante_id: string;
  solicitante_email: string;
  solicitante_nome: string;
  updated_at: string;
}

/**
 * Labels para os status de demanda
 */
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aberto: { label: "Aberto", color: "blue" },
  em_execucao: { label: "Em Andamento", color: "yellow" },
  impedido: { label: "Impedido", color: "orange" },
  cancelado: { label: "Cancelado", color: "red" },
  concluido: { label: "Concluído", color: "green" },
};

/**
 * Obtém dados da demanda e do solicitante
 */
const getDemandaData = async (
  demandaId: string
): Promise<DemandaNotificationData | null> => {
  try {
    const { data: demanda, error: demandaError } = await supabase
      .from("demandas")
      .select(
        `
        id,
        titulo,
        descricao,
        status,
        solicitante_id,
        updated_at,
        profiles:solicitante_id (email, nome)
      `
      )
      .eq("id", demandaId)
      .single();

    if (demandaError || !demanda) {
      console.error("Erro ao obter demanda:", demandaError);
      return null;
    }

    return {
      demanda_id: demanda.id,
      titulo: demanda.titulo,
      descricao: demanda.descricao,
      status_novo: demanda.status,
      status_anterior: demanda.status, // Será preenchido pelo trigger
      solicitante_id: demanda.solicitante_id,
      solicitante_email: demanda.profiles?.email || "",
      solicitante_nome: demanda.profiles?.nome || "Usuário",
      updated_at: demanda.updated_at,
    };
  } catch (error) {
    console.error("Erro ao buscar dados da demanda:", error);
    return null;
  }
};

/**
 * Verifica se um e-mail já foi enviado para evitar duplicatas
 */
const checkEmailAlreadySent = async (
  demandaId: string,
  tipoNotificacao: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("demanda_email_log")
      .select("id")
      .eq("demanda_id", demandaId)
      .eq("tipo_notificacao", tipoNotificacao)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Erro ao verificar log de e-mail:", error);
    }

    return !!data;
  } catch (error) {
    console.error("Erro ao checar e-mail duplicado:", error);
    return false;
  }
};

/**
 * Envia notificação de e-mail manualmente (útil para testes)
 * Normalmente é disparado automaticamente pelo trigger do banco
 */
export const sendDemandaEmailNotification = async (
  demandaId: string,
  showToast = true
): Promise<boolean> => {
  try {
    // Obter dados da demanda
    const demandaData = await getDemandaData(demandaId);
    if (!demandaData) {
      if (showToast) toast.error("Demanda não encontrada");
      return false;
    }

    // Verificar se já foi enviado
    const tipoNotificacao = `status_${demandaData.status_novo}`;
    const jáEnviado = await checkEmailAlreadySent(demandaId, tipoNotificacao);

    if (jáEnviado) {
      if (showToast) {
        toast.info("E-mail para este status já foi enviado anteriormente");
      }
      console.warn(`E-mail duplicado evitado para demanda ${demandaId}`);
      return false;
    }

    // Chamar a edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-demand-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
        body: JSON.stringify(demandaData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Erro ao enviar e-mail:", error);
      if (showToast) {
        toast.error("Erro ao enviar e-mail", {
          description: error.error || "Tente novamente mais tarde",
        });
      }
      return false;
    }

    const result = await response.json();

    if (showToast) {
      toast.success("E-mail enviado com sucesso!");
    }

    console.log("E-mail enviado:", result);
    return true;
  } catch (error) {
    console.error("Erro ao enviar notificação de e-mail:", error);
    if (showToast) {
      toast.error("Erro ao enviar e-mail", {
        description: "Ocorreu um erro inesperado",
      });
    }
    return false;
  }
};

/**
 * Obtém histórico de e-mails enviados para uma demanda
 */
export const getDemandaEmailHistory = async (demandaId: string) => {
  try {
    const { data, error } = await supabase
      .from("demanda_email_log")
      .select("*")
      .eq("demanda_id", demandaId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao obter histórico de e-mails:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Erro ao buscar histórico de e-mails:", error);
    return [];
  }
};

/**
 * Retentar envio de e-mail que falhou
 */
export const retryFailedEmailNotification = async (
  logId: string,
  demandaId: string
): Promise<boolean> => {
  try {
    // Obter dados da demanda
    const demandaData = await getDemandaData(demandaId);
    if (!demandaData) {
      toast.error("Demanda não encontrada");
      return false;
    }

    // Chamar a edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-demand-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
        body: JSON.stringify(demandaData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      toast.error("Erro ao retentar envio de e-mail", {
        description: error.error || "Tente novamente mais tarde",
      });
      return false;
    }

    // Atualizar o log (remover erro)
    const { error: updateError } = await supabase
      .from("demanda_email_log")
      .update({ erro_envio: null })
      .eq("id", logId);

    if (updateError) {
      console.error("Erro ao atualizar log:", updateError);
    }

    toast.success("E-mail reenviado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao retentar envio:", error);
    toast.error("Erro ao retentar envio");
    return false;
  }
};
