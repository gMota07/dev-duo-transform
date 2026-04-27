import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge, UrgenciaBadge } from "@/components/StatusBadge";
import { PlusCircle, Search, FileText, Loader2 } from "lucide-react";
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
}

const MinhasDemandas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("demandas")
        .select("id, titulo, status, urgencia, prazo_desejado, created_at, categoria:categorias(nome)")
        .eq("solicitante_id", user.id)
        .order("created_at", { ascending: false });
      setDemandas((data as any) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = demandas.filter((d) =>
    d.titulo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Minhas Demandas</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas solicitações e seu status
          </p>
        </div>
        <Button onClick={() => navigate("/nova")} className="gradient-primary">
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Demanda
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Nenhuma demanda encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Tente outro termo de busca" : "Você ainda não abriu nenhuma demanda"}
          </p>
          {!search && (
            <Button onClick={() => navigate("/nova")} className="gradient-primary">
              <PlusCircle className="h-4 w-4 mr-2" />
              Criar primeira demanda
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((d) => (
            <Card
              key={d.id}
              className="p-5 cursor-pointer hover:shadow-elegant hover:border-primary/30 transition-all"
              onClick={() => navigate(`/demanda/${d.id}`)}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold line-clamp-1 text-xs">{d.titulo}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    {d.categoria && <span>{d.categoria.nome}</span>}
                    <span>·</span>
                    <span>
                      {format(new Date(d.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </span>
                    {d.prazo_desejado && (
                      <>
                        <span>·</span>
                        <span>
                          Prazo:{" "}
                          {format(new Date(d.prazo_desejado + "T00:00:00"), "dd/MM/yyyy")}
                        </span>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default MinhasDemandas;
