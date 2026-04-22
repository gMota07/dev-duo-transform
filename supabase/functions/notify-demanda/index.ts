// Edge function: envia email de notificação ao solicitante quando o admin
// muda status ou adiciona resposta. Usa Resend.
// Requer secret RESEND_API_KEY configurada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_execucao: "Em execução",
  impedido: "Impedido",
  cancelado: "Cancelado",
  concluido: "Concluído",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    // Confere se quem chama é admin
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { demanda_id, tipo, status_novo } = await req.json();
    if (!demanda_id || !tipo) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega demanda + solicitante
    const { data: dem } = await admin
      .from("demandas")
      .select(`id, titulo, status, resposta_admin,
               solicitante:profiles!demandas_solicitante_id_fkey(nome, email)`)
      .eq("id", demanda_id)
      .maybeSingle();

    if (!dem || !(dem as any).solicitante?.email) {
      return new Response(JSON.stringify({ error: "Demanda ou solicitante não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendKey) {
      // Email não configurado: retorna sucesso sem enviar (não bloqueia o fluxo)
      console.warn("RESEND_API_KEY não configurada — email não enviado");
      return new Response(JSON.stringify({ success: true, sent: false, reason: "email_not_configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const solicitante = (dem as any).solicitante;
    const subject =
      tipo === "resposta"
        ? `Resposta da equipe — ${dem.titulo}`
        : `Status atualizado: ${STATUS_LABEL[status_novo] ?? status_novo} — ${dem.titulo}`;

    const html = `
<!doctype html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;background:#f5f3ff;font-family:Arial,sans-serif;color:#1a1a2e;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#6d28d9,#3b5bdb);border-radius:12px 12px 0 0;padding:24px;color:#fff;">
      <h1 style="margin:0;font-size:20px;">FS Consultores</h1>
      <p style="margin:4px 0 0;opacity:.9;font-size:13px;">Sistema de Demandas</p>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px;box-shadow:0 4px 12px rgba(109,40,217,.1);">
      <p>Olá <strong>${solicitante.nome}</strong>,</p>
      ${tipo === "resposta"
        ? `<p>Sua demanda recebeu uma resposta da nossa equipe:</p>
           <div style="background:#f5f3ff;border-left:4px solid #6d28d9;padding:14px;border-radius:6px;margin:16px 0;white-space:pre-wrap;">${escapeHtml(dem.resposta_admin ?? "")}</div>`
        : `<p>O status da sua demanda foi atualizado para:</p>
           <p style="font-size:18px;font-weight:bold;color:#6d28d9;margin:12px 0;">${STATUS_LABEL[status_novo] ?? status_novo}</p>`
      }
      <div style="background:#faf9ff;border:1px solid #ede9fe;border-radius:8px;padding:14px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#666;">Demanda</p>
        <p style="margin:4px 0 0;font-weight:600;">${escapeHtml(dem.titulo)}</p>
      </div>
      <p style="font-size:13px;color:#666;margin-top:24px;">
        Acesse o sistema para ver os detalhes completos.
      </p>
    </div>
    <p style="text-align:center;color:#999;font-size:11px;margin-top:16px;">
      © FS Consultores — Sistema de Demandas
    </p>
  </div>
</body></html>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FS Consultores <onboarding@resend.dev>",
        to: [solicitante.email],
        subject,
        html,
      }),
    });

    const result = await r.json();
    if (!r.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ success: false, error: result }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, sent: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}
