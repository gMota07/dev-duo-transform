import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge, UrgenciaBadge, STATUS_OPTIONS } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Loader2, Inbox, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
  const [tab, setTab] = useState<"pendentes" | "todas" | "concluidas">("pendentes");

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
  }, []);

  const filtered = demandas.filter((d) => {
    const matchSearch = d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (d.solicitante?.nome ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || d.status === statusFilter;
    const matchTab =
      tab === "todas" ||
      (tab === "concluidas" && d.status === "concluido") ||
      (tab === "pendentes" && d.status !== "concluido" && d.status !== "cancelado");
    return matchSearch && matchStatus && matchTab;
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
    <div className="p-8 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard de Demandas</h1>
        <p className="text-muted-foreground mt-1">
          Visualize, atribua e responda todas as demandas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 gradient-primary text-primary-foreground">
          <p className="text-sm opacity-90">Total</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Abertas</p>
          <p className="text-3xl font-bold mt-1 text-status-aberto">{stats.aberto}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Em execução</p>
          <p className="text-3xl font-bold mt-1 text-status-execucao">{stats.execucao}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Concluídas</p>
          <p className="text-3xl font-bold mt-1 text-status-concluido">{stats.concluido}</p>
        </Card>
      </div>

      {/* Métricas de Desempenho */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-primary/50">
          <p className="text-sm text-muted-foreground">SLA (% Concluído no Prazo)</p>
          <p className="text-3xl font-bold mt-1" style={{ color: stats.sla >= 80 ? '#00a854' : stats.sla >= 60 ? '#f5a623' : '#d9534f' }}>
            {stats.sla}%
          </p>
        </Card>
        <Card className="p-5 border-primary/50">
          <p className="text-sm text-muted-foreground">TMR (Tempo Médio de Resposta)</p>
          <p className="text-3xl font-bold mt-1">{stats.tmr}h</p>
          <p className="text-xs text-muted-foreground mt-1">{(stats.tmr * 60).toFixed(0)} minutos</p>
        </Card>
        <Card className="p-5 border-primary/50">
          <p className="text-sm text-muted-foreground">Tempo Médio de Conclusão</p>
          <p className="text-3xl font-bold mt-1">{stats.tempoMedioConclusao}h</p>
          <p className="text-xs text-muted-foreground mt-1">{(stats.tempoMedioConclusao * 60).toFixed(0)} minutos</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="pendentes">
            Não concluídas ({demandas.filter((d) => d.status !== "concluido" && d.status !== "cancelado").length})
          </TabsTrigger>
          <TabsTrigger value="concluidas">
            Concluídas ({stats.concluido})
          </TabsTrigger>
          <TabsTrigger value="todas">Todas ({stats.total})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou solicitante..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold">Nenhuma demanda encontrada</h3>
        </Card>
      ) : (
        <div className="grid gap-3 w-full overflow-hidden">
          {filtered.map((d) => (
            <Collapsible key={d.id} asChild>
              <Card className="p-4 hover:border-primary/30 transition-all overflow-hidden w-full cursor-pointer" onClick={() => navigate(`/demanda/${d.id}`)}>
                {/* Linha compacta — sempre visível */}
                <div className="flex items-start justify-between gap-4 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm md:text-base truncate break-words line-clamp-2">{d.titulo}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs md:text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{d.solicitante?.nome ?? "—"}</span>
                      <span>· {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={d.status} />
                      <UrgenciaBadge urgencia={d.urgencia} />
                    </div>
                    <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                {/* Conteúdo expandido — Leia mais */}
                <CollapsibleContent className="mt-4 pt-4 border-t text-sm space-y-3 overflow-hidden w-full">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full overflow-hidden">
                    <div>
                      <p className="text-muted-foreground text-xs">Categoria</p>
                      <p className="font-medium">{d.categoria?.nome ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Prazo</p>
                      <p className="font-medium">
                        {d.prazo_desejado
                          ? format(new Date(d.prazo_desejado + "T00:00:00"), "dd/MM/yyyy")
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Responsável</p>
                      <p className="font-medium">{d.responsavel?.nome ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <p className="font-medium capitalize">{d.status.replace("_", " ")}</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
