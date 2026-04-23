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
import { Search, Loader2, Inbox } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Demanda {
  id: string;
  titulo: string;
  status: any;
  urgencia: any;
  prazo_desejado: string | null;
  created_at: string;
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
          id, titulo, status, urgencia, prazo_desejado, created_at,
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
    return matchSearch && matchStatus;
  });

  const stats = {
    total: demandas.length,
    aberto: demandas.filter((d) => d.status === "aberto").length,
    execucao: demandas.filter((d) => d.status === "em_execucao").length,
    concluido: demandas.filter((d) => d.status === "concluido").length,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
        <div className="grid gap-3">
          {filtered.map((d) => (
            <Card
              key={d.id}
              className="p-5 cursor-pointer hover:shadow-elegant hover:border-primary/30 transition-all"
              onClick={() => navigate(`/demanda/${d.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{d.titulo}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{d.solicitante?.nome ?? "—"}</span>
                    {d.categoria && <span>· {d.categoria.nome}</span>}
                    <span>· {format(new Date(d.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    {d.responsavel && (
                      <span className="text-accent-foreground font-medium">
                        · Resp: {d.responsavel.nome}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={d.status} />
                  <UrgenciaBadge urgencia={d.urgencia} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
