import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface EmailRequest {
  demanda_id: string;
  titulo: string;
  descricao: string;
  status_novo: string;
  status_anterior: string;
  solicitante_id: string;
  solicitante_email: string;
  solicitante_nome: string;
  updated_at: string;
}

// Templates de e-mail
const getEmailTemplate = (
  status: string,
  nome: string,
  titulo: string,
  descricao: string,
  dataAtualizacao: string
) => {
  const statusLabel = {
    em_execucao: "Em andamento",
    concluido: "Concluída",
    cancelado: "Cancelada",
    impedido: "Impedida",
    aberto: "Aberta",
  }[status] || status;

  const dataFormatada = new Date(dataAtualizacao).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (status === "em_execucao") {
    return {
      subject: `Sua demanda está em andamento - "${titulo}"`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #793E92;">Olá, ${nome}!</h2>
              
              <p>Sua demanda <strong>"${titulo}"</strong> foi iniciada e já está em tratamento.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #793E92; margin: 20px 0;">
                <p><strong>Status:</strong> Em andamento</p>
                <p><strong>Data da atualização:</strong> ${dataFormatada}</p>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 0.9em;">
                  Resumo: ${descricao.substring(0, 150)}${descricao.length > 150 ? "..." : ""}
                </p>
              </div>
              
              <p>Você poderá acompanhar o andamento pelo sistema.</p>
              
              <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                Este é um e-mail automático. Não responda diretamente neste e-mail.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Olá, ${nome}!\n\nSua demanda "${titulo}" foi iniciada e já está em tratamento.\n\nStatus: Em andamento\nData da atualização: ${dataFormatada}\n\nVocê poderá acompanhar o andamento pelo sistema.`,
    };
  }

  if (status === "concluido") {
    return {
      subject: `Sua demanda foi concluída - "${titulo}"`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #793E92;">Olá, ${nome}!</h2>
              
              <p>Sua demanda <strong>"${titulo}"</strong> foi finalizada com sucesso!</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
                <p><strong>Status:</strong> Concluída ✓</p>
                <p><strong>Data da conclusão:</strong> ${dataFormatada}</p>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 0.9em;">
                  Resumo: ${descricao.substring(0, 150)}${descricao.length > 150 ? "..." : ""}
                </p>
              </div>
              
              <p>Caso tenha dúvidas sobre a resolução ou necessite fazer alterações, você pode abrir uma nova demanda ou entrar em contato através do sistema.</p>
              
              <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                Este é um e-mail automático. Não responda diretamente neste e-mail.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Olá, ${nome}!\n\nSua demanda "${titulo}" foi finalizada com sucesso!\n\nStatus: Concluída ✓\nData da conclusão: ${dataFormatada}\n\nCaso necessite, você pode abrir uma nova demanda.`,
    };
  }

  if (status === "cancelado") {
    return {
      subject: `Sua demanda foi cancelada - "${titulo}"`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #793E92;">Olá, ${nome}!</h2>
              
              <p>Sua demanda <strong>"${titulo}"</strong> foi cancelada.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                <p><strong>Status:</strong> Cancelada</p>
                <p><strong>Data da atualização:</strong> ${dataFormatada}</p>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 0.9em;">
                  Resumo: ${descricao.substring(0, 150)}${descricao.length > 150 ? "..." : ""}
                </p>
              </div>
              
              <p>Se você acredita que isso foi feito por engano, entre em contato conosco ou abra uma nova demanda.</p>
              
              <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                Este é um e-mail automático. Não responda diretamente neste e-mail.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Olá, ${nome}!\n\nSua demanda "${titulo}" foi cancelada.\n\nStatus: Cancelada\nData da atualização: ${dataFormatada}`,
    };
  }

  if (status === "impedido") {
    return {
      subject: `Sua demanda foi impedida - "${titulo}"`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #793E92;">Olá, ${nome}!</h2>
              
              <p>Sua demanda <strong>"${titulo}"</strong> foi impedida e necessita de ação.</p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p><strong>Status:</strong> Impedida ⚠️</p>
                <p><strong>Data da atualização:</strong> ${dataFormatada}</p>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 0.9em;">
                  Resumo: ${descricao.substring(0, 150)}${descricao.length > 150 ? "..." : ""}
                </p>
              </div>
              
              <p>Por favor, verifique os detalhes no sistema e tome as ações necessárias.</p>
              
              <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                Este é um e-mail automático. Não responda diretamente neste e-mail.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Olá, ${nome}!\n\nSua demanda "${titulo}" foi impedida.\n\nStatus: Impedida ⚠️\nData da atualização: ${dataFormatada}`,
    };
  }

  // Template padrão
  return {
    subject: `Atualização de sua demanda - "${titulo}"`,
    html: `<html><body><p>Olá, ${nome}!</p><p>Sua demanda foi atualizada para: ${statusLabel}</p></body></html>`,
    text: `Sua demanda foi atualizada para: ${statusLabel}`,
  };
};

// Enviar e-mail via Resend
const sendEmailViaResend = async (
  destinatario: string,
  assunto: string,
  html: string,
  texto: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY não configurada");
    return { success: false, error: "API key não configurada" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@fs-consultores.com.br",
        to: destinatario,
        subject: assunto,
        html: html,
        text: texto,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Erro ao enviar e-mail:", error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("Erro ao enviar via Resend:", error);
    return { success: false, error: String(error) };
  }
};

// Registrar no log (mesmo que o envio falhe)
const registerEmailLog = async (
  supabase: any,
  demandaId: string,
  destinatario: string,
  tipoNotificacao: string,
  statusDemanda: string,
  assunto: string,
  corpoEmail: string,
  erroEnvio?: string
) => {
  try {
    const { error } = await supabase
      .from("demanda_email_log")
      .insert({
        demanda_id: demandaId,
        destinatario_email: destinatario,
        tipo_notificacao: tipoNotificacao,
        status_demanda_trigger: statusDemanda,
        assunto,
        corpo_email: corpoEmail,
        erro_envio: erroEnvio || null,
      });

    if (error) console.error("Erro ao registrar log:", error);
  } catch (error) {
    console.error("Erro ao registrar email log:", error);
  }
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const emailRequest: EmailRequest = await req.json();

    // Validações
    if (
      !emailRequest.demanda_id ||
      !emailRequest.solicitante_email ||
      !emailRequest.titulo
    ) {
      return new Response("Dados incompletos", { status: 400 });
    }

    // Status que devem disparar e-mail
    const statusesToNotify = ["em_execucao", "concluido", "cancelado", "impedido"];

    if (!statusesToNotify.includes(emailRequest.status_novo)) {
      return new Response("Status não requer notificação", { status: 200 });
    }

    // Gerar template de e-mail
    const emailTemplate = getEmailTemplate(
      emailRequest.status_novo,
      emailRequest.solicitante_nome || "Usuário",
      emailRequest.titulo,
      emailRequest.descricao || "",
      emailRequest.updated_at
    );

    // Enviar e-mail
    const sendResult = await sendEmailViaResend(
      emailRequest.solicitante_email,
      emailTemplate.subject,
      emailTemplate.html,
      emailTemplate.text
    );

    // Inicializar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Registrar no log
    const tipoNotificacao = `status_${emailRequest.status_novo}`;
    await registerEmailLog(
      supabase,
      emailRequest.demanda_id,
      emailRequest.solicitante_email,
      tipoNotificacao,
      emailRequest.status_novo,
      emailTemplate.subject,
      emailTemplate.html,
      sendResult.success ? undefined : sendResult.error
    );

    if (sendResult.success) {
      return new Response(
        JSON.stringify({
          success: true,
          messageId: sendResult.messageId,
          message: "E-mail enviado com sucesso",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      console.error("Falha ao enviar e-mail:", sendResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: sendResult.error,
          message: "Falha ao enviar e-mail (log registrado)",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Erro na edge function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
