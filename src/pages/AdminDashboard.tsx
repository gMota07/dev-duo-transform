import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge, UrgenciaBadge, STATUS_OPTIONS } from "@/components/StatusBadge";
import { Search, Loader2, Inbox } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Collapsible,
} from "@/components/ui/collapsible";

interface Demanda {
  id: string;
  titulo: string;
  status: any;
  urgencia: any;
  prazo_desejado: string | null;
  created_at: string;
  updated_at: string;
  categoria: { nome: string } | null;
  solicitante: { nome: string } | null;
  responsavel: { nome: string } | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("demandas")
        .select(`
          id, titulo, status, urgencia, prazo_desejado, created_at, updated_at,
          categoria:categorias(nome),
          solicitante:profiles!demandas_solicitante_id_fkey(nome),
          responsavel:profiles!demandas_responsavel_id_fkey(nome)
        `)
        .order("created_at", { ascending: false });
      setDemandas((data as any) ?? []);
      setLoading(false);
    };
    load();

    // Escuta mudanças em tempo real na tabela demandas
    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demandas" },
        () => {
          // Recarrega as demandas quando há mudanças
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = demandas.filter((d) => {
    const matchSearch = d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (d.solicitante?.nome ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || d.status === statusFilter;
    // Dashboard mostra apenas demandas NÃO concluídas
    const isNotCompleted = d.status !== "concluido" && d.status !== "cancelado";
    return matchSearch && matchStatus && isNotCompleted;
  });

  // Calcular SLA: % de demandas concluídas dentro do prazo
  const demandasConcluidas = demandas.filter((d) => d.status === "concluido");
  const slaPercentual = demandasConcluidas.length > 0
    ? (demandasConcluidas.filter((d) => {
      if (!d.prazo_desejado) return true; // sem prazo = SLA OK
      return new Date(d.updated_at) <= new Date(d.prazo_desejado + "T23:59:59");
    }).length / demandasConcluidas.length) * 100
    : 0;

  // Calcular TMR (Tempo Médio de Resposta) em horas
  const temposResposta = demandas
    .filter((d) => d.updated_at !== d.created_at) // apenas as que tiveram resposta
    .map((d) => {
      const criacao = new Date(d.created_at);
      const atualizacao = new Date(d.updated_at);
      return (atualizacao.getTime() - criacao.getTime()) / (1000 * 60 * 60); // em horas
    });
  const tmrHoras = temposResposta.length > 0
    ? temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length
    : 0;

  // Calcular tempo médio de conclusão em horas
  const temposConclusao = demandasConcluidas.map((d) => {
    const criacao = new Date(d.created_at);
    const conclusao = new Date(d.updated_at);
    return (conclusao.getTime() - criacao.getTime()) / (1000 * 60 * 60); // em horas
  });
  const tempoMedioConclusao = temposConclusao.length > 0
    ? temposConclusao.reduce((a, b) => a + b, 0) / temposConclusao.length
    : 0;

  const stats = {
    total: demandas.length,
    aberto: demandas.filter((d) => d.status === "aberto").length,
    execucao: demandas.filter((d) => d.status === "em_execucao").length,
    concluido: demandasConcluidas.length,
    sla: Math.round(slaPercentual),
    tmr: Math.round(tmrHoras * 10) / 10, // 1 casa decimal
    tempoMedioConclusao: Math.round(tempoMedioConclusao * 10) / 10, // em horas
  };

  return (
    <div className="p-3 max-w-7xl mx-auto w-full">
      {/* Stats Resumido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <Card className="p-3 gradient-primary text-primary-foreground">
          <p className="text-xs opacity-90">Total</p>
          <p className="text-xl font-bold mt-0.5">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Abertas</p>
          <p className="text-xl font-bold mt-0.5 text-status-aberto">{stats.aberto}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Em execução</p>
          <p className="text-xl font-bold mt-0.5 text-status-execucao">{stats.execucao}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">SLA</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: stats.sla >= 80 ? '#00a854' : stats.sla >= 60 ? '#f5a623' : '#d9534f' }}>
            {stats.sla}%
          </p>
        </Card>
      </div>

      {/* Métricas Compactas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
        <Card className="p-2 border-primary/50">
          <p className="text-xs text-muted-foreground">TMR</p>
          <p className="text-lg font-bold">{stats.tmr}h</p>
          <p className="text-xs text-muted-foreground">{(stats.tmr * 60).toFixed(0)}m</p>
        </Card>
        <Card className="p-2 border-primary/50">
          <p className="text-xs text-muted-foreground">Conclusão</p>
          <p className="text-lg font-bold">{stats.tempoMedioConclusao}h</p>
          <p className="text-xs text-muted-foreground">{(stats.tempoMedioConclusao * 60).toFixed(0)}m</p>
        </Card>
        <Card className="p-2 border-primary/50 hidden md:block">
          <p className="text-xs text-muted-foreground">Concluídas</p>
          <p className="text-lg font-bold">{stats.concluido}</p>
          <p className="text-xs text-muted-foreground">de {stats.total}</p>
        </Card>
      </div>

      {/* Busca compacta */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar demanda..."
            className="pl-10 text-xs py-1.5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-xs py-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista Compacta */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <h3 className="font-semibold text-sm">Nenhuma demanda em andamento</h3>
          <p className="text-xs text-muted-foreground mt-1">Todas as demandas foram concluídas</p>
        </Card>
      ) : (
        <div className="space-y-1">
          {filtered.map((d) => (
            <Collapsible key={d.id} asChild>
              <Card 
                className="p-2 hover:border-primary/30 transition-all cursor-pointer text-xs" 
                onClick={() => navigate(`/demanda/${d.id}`)}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold line-clamp-1 text-xs">{d.titulo}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      <span>{d.solicitante?.nome ?? "—"}</span>
                      <span>·</span>
                      <span>Aberto em: {format(new Date(d.created_at), "dd/MM", { locale: ptBR })}</span>
                      {d.prazo_desejado && (
                        <>
                          <span>·</span>
                          <span>Prazo: {format(parseISO(d.prazo_desejado), "dd/MM", { locale: ptBR })}</span>
                        </>
                      )}
                    </div>
                  </div> 
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={d.status} />
                    <UrgenciaBadge urgencia={d.urgencia} />
                  </div>
                </div>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
