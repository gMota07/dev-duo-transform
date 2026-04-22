import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge, UrgenciaBadge, STATUS_OPTIONS } from "@/components/StatusBadge";
import { ArrowLeft, Loader2, Paperclip, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DemandaDetalhe = () => {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  const [demanda, setDemanda] = useState<any>(null);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // edit fields (admin)
  const [novoStatus, setNovoStatus] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [resposta, setResposta] = useState("");

  const load = async () => {
    if (!id) return;
    const [d, a, h] = await Promise.all([
      supabase.from("demandas").select(`
        *,
        categoria:categorias(nome),
        subcategoria:subcategorias(nome),
        solicitante:profiles!demandas_solicitante_id_fkey(nome, email),
        responsavel:profiles!demandas_responsavel_id_fkey(nome, email)
      `).eq("id", id).maybeSingle(),
      supabase.from("demanda_anexos").select("*").eq("demanda_id", id),
      supabase.from("demanda_historico").select(`
        *, user:profiles!demanda_historico_user_id_fkey(nome)
      `).eq("demanda_id", id).order("created_at", { ascending: false }),
    ]);
    setDemanda(d.data);
    setAnexos(a.data ?? []);
    setHistorico((h.data as any) ?? []);
    if (d.data) {
      setNovoStatus(d.data.status);
      setResponsavelId(d.data.responsavel_id ?? "none");
      setResposta(d.data.resposta_admin ?? "");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      // carregar admins disponíveis
      supabase
        .from("user_roles")
        .select("user_id, profiles!inner(id, nome)")
        .eq("role", "admin")
        .then(({ data }) => {
          setAdmins(((data as any) ?? []).map((r: any) => r.profiles));
        });
    }
  }, [id, isAdmin]);

  const handleDownload = async (path: string, nome: string) => {
    const { data } = await supabase.storage.from("demanda-anexos").createSignedUrl(path, 60);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = nome;
      a.click();
    }
  };

  const handleSave = async () => {
    if (!demanda || !user) return;
    setSaving(true);
    try {
      const updates: any = {};
      const statusChanged = novoStatus !== demanda.status;
      const respostaChanged = resposta !== (demanda.resposta_admin ?? "");
      const respChanged = (responsavelId === "none" ? null : responsavelId) !== demanda.responsavel_id;

      if (statusChanged) updates.status = novoStatus;
      if (respostaChanged) updates.resposta_admin = resposta || null;
      if (respChanged) updates.responsavel_id = responsavelId === "none" ? null : responsavelId;

      if (Object.keys(updates).length === 0) {
        toast.info("Nenhuma alteração para salvar");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("demandas").update(updates).eq("id", demanda.id);
      if (error) throw error;

      // histórico
      if (statusChanged) {
        await supabase.from("demanda_historico").insert({
          demanda_id: demanda.id,
          user_id: user.id,
          acao: "status_alterado",
          status_anterior: demanda.status,
          status_novo: novoStatus,
        });
      }
      if (respostaChanged) {
        await supabase.from("demanda_historico").insert({
          demanda_id: demanda.id,
          user_id: user.id,
          acao: "resposta_adicionada",
          observacao: resposta,
        });
      }

      // dispara emails (mudança de status e/ou resposta)
      if (statusChanged || respostaChanged) {
        supabase.functions.invoke("notify-demanda", {
          body: {
            demanda_id: demanda.id,
            tipo: respostaChanged ? "resposta" : "status",
            status_novo: novoStatus,
          },
        });
      }

      toast.success("Demanda atualizada!");
      load();
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!demanda) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Card className="p-8 mt-4 text-center">Demanda não encontrada</Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Cabeçalho */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold">{demanda.titulo}</h1>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={demanda.status} />
                <UrgenciaBadge urgencia={demanda.urgencia} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-4 border-t">
              <div>
                <p className="text-muted-foreground">Categoria</p>
                <p className="font-medium">{demanda.categoria?.nome ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Subcategoria</p>
                <p className="font-medium">{demanda.subcategoria?.nome ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prazo</p>
                <p className="font-medium">
                  {demanda.prazo_desejado
                    ? format(new Date(demanda.prazo_desejado + "T00:00:00"), "dd/MM/yyyy")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Aberta em</p>
                <p className="font-medium">
                  {format(new Date(demanda.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </Card>

          {/* Descrição */}
          <Card className="p-6">
            <h2 className="font-semibold mb-3">Descrição</h2>
            <p className="text-sm whitespace-pre-wrap text-foreground/90">{demanda.descricao}</p>
          </Card>

          {/* Anexos */}
          {anexos.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Anexos ({anexos.length})
              </h2>
              <div className="space-y-2">
                {anexos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleDownload(a.storage_path, a.nome_arquivo)}
                    className="flex items-center justify-between w-full bg-muted/50 hover:bg-muted px-3 py-2 rounded text-sm transition"
                  >
                    <span className="truncate">{a.nome_arquivo}</span>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Resposta do admin (visível para todos) */}
          {!isAdmin && demanda.resposta_admin && (
            <Card className="p-6 border-primary/30 bg-accent/30">
              <h2 className="font-semibold mb-3 text-accent-foreground">
                Resposta da Administração
              </h2>
              <p className="text-sm whitespace-pre-wrap">{demanda.resposta_admin}</p>
            </Card>
          )}

          {/* Painel admin */}
          {isAdmin && (
            <Card className="p-6 border-primary/30">
              <h2 className="font-semibold mb-4">Gestão da demanda</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={novoStatus} onValueChange={setNovoStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={responsavelId} onValueChange={setResponsavelId}>
                    <SelectTrigger><SelectValue placeholder="Atribuir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {admins.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <Label>Resposta administrativa</Label>
                <Textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  placeholder="Escreva uma resposta para o solicitante..."
                  rows={5}
                />
              </div>
              <Button onClick={handleSave} className="gradient-primary" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar alterações
              </Button>
            </Card>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Solicitante</h3>
            <p className="text-sm font-medium">{demanda.solicitante?.nome}</p>
            <p className="text-xs text-muted-foreground">{demanda.solicitante?.email}</p>
            {demanda.responsavel && (
              <>
                <h3 className="font-semibold mt-4 mb-2">Responsável</h3>
                <p className="text-sm font-medium">{demanda.responsavel.nome}</p>
                <p className="text-xs text-muted-foreground">{demanda.responsavel.email}</p>
              </>
            )}
          </Card>

          {historico.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Histórico</h3>
              <div className="space-y-3 text-sm">
                {historico.map((h) => (
                  <div key={h.id} className="border-l-2 border-primary/40 pl-3">
                    <p className="font-medium">
                      {h.acao === "status_alterado"
                        ? `Status alterado`
                        : h.acao === "resposta_adicionada"
                        ? "Resposta adicionada"
                        : h.acao}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.user?.nome ?? "Sistema"} ·{" "}
                      {format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemandaDetalhe;
