// One-shot function: cria o primeiro admin se ainda não existir nenhum.
// Pública (verify_jwt = false) mas só funciona enquanto não houver admin no sistema.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Já existe algum admin?
    const { data: existing, error: roleErr } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);
    if (roleErr) throw roleErr;

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "Já existe um administrador no sistema. Esta função foi desativada.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const EMAIL = "admin@fsconsultores.com.br";
    const PASSWORD = "admin123";
    const NOME = "Administrador FS";

    // Cria usuário
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { nome: NOME },
    });
    if (createErr) throw createErr;
    if (!created.user) throw new Error("Falha ao criar usuário admin");

    // Promove a admin (trigger criou 'usuario' por padrão)
    await admin.from("user_roles").delete().eq("user_id", created.user.id);
    await admin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });

    return new Response(JSON.stringify({
      success: true,
      email: EMAIL,
      password: PASSWORD,
      message: "Administrador criado com sucesso!",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
