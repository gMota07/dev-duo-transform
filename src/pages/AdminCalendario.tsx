import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";

interface EscalaDia {
  id: string;
  user_id: string;
  data: string;
  ordem: number;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  observacao: string | null;
  ausente: boolean;
  tipo_ausencia: string | null;
}

interface Ferias {
  id: string;
  user_id: string;
  data_inicio: string;
  data_fim: string;
  periodo: number;
  ano: number;
}

interface Profile {
  id: string;
  nome: string;
}

const colorForUser = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 50%)`;
};

const AdminCalendario = () => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [escalas, setEscalas] = useState<EscalaDia[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [currentMonth]);
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
  const calendarCells: (Date | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...daysInMonth,
  ];

  const load = async () => {
    setLoading(true);
    try {
      const [esc, fer, prof] = await Promise.all([
        supabase
          .from("escalas_dia")
          .select("*")
          .gte("data", format(monthStart, "yyyy-MM-dd"))
          .lte("data", format(monthEnd, "yyyy-MM-dd"))
          .order("data")
          .order("ordem"),
        supabase
          .from("ferias")
          .select("*")
          .lte("data_inicio", format(monthEnd, "yyyy-MM-dd"))
          .gte("data_fim", format(monthStart, "yyyy-MM-dd")),
        supabase.from("profiles").select("id, nome").order("nome"),
      ]);
      if (esc.error) throw esc.error;
      if (fer.error) throw fer.error;
      if (prof.error) throw prof.error;
      setEscalas(esc.data ?? []);
      setFerias(fer.data ?? []);
      setProfiles(prof.data ?? []);
    } catch (err) {
      toast.error("Erro ao carregar", { description: friendlyError(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentMonth]);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const filteredEscalas = useMemo(
    () => (filterUser === "all" ? escalas : escalas.filter((e) => e.user_id === filterUser)),
    [escalas, filterUser],
  );
  const filteredFerias = useMemo(
    () => (filterUser === "all" ? ferias : ferias.filter((f) => f.user_id === filterUser)),
    [ferias, filterUser],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { type: "escala" | "ferias"; data: any }[]>();
    for (const e of filteredEscalas) {
      if (!map.has(e.data)) map.set(e.data, []);
      map.get(e.data)!.push({ type: "escala", data: e });
    }
    for (const f of filteredFerias) {
      const start = startOfDay(parseISO(f.data_inicio));
      const end = startOfDay(parseISO(f.data_fim));
      for (const day of daysInMonth) {
        const d = startOfDay(day);
        if (d >= start && d <= end) {
          const key = format(day, "yyyy-MM-dd");
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push({ type: "ferias", data: f });
        }
      }
    }
    return map;
  }, [filteredEscalas, filteredFerias, daysInMonth]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Calendário da Equipe</h1>
          <p className="text-muted-foreground mt-1">Escala e férias consolidadas</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
              Hoje
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os colaboradores</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
            {calendarCells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = format(day, "yyyy-MM-dd");
              const events = eventsByDay.get(key) ?? [];
              const isToday = isSameDay(day, new Date());
              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "min-h-[100px] p-1.5 rounded border text-left flex flex-col gap-0.5 transition-colors hover:bg-accent",
                        isSameMonth(day, currentMonth) ? "bg-card" : "bg-muted/40 opacity-60",
                        isToday && "ring-2 ring-primary",
                      )}
                    >
                      <div className="text-xs font-semibold">{format(day, "d")}</div>
                      {events.slice(0, 3).map((ev, idx) => {
                        const userId = ev.data.user_id;
                        const nome = profileMap.get(userId)?.nome ?? "?";
                        const color = colorForUser(userId);
                        if (ev.type === "ferias") {
                          return (
                            <div
                              key={`f-${idx}`}
                              className="text-[10px] px-1 py-0.5 rounded truncate"
                              style={{ background: `${color}22`, color }}
                            >
                              ✈ {nome}
                            </div>
                          );
                        }
                        const e = ev.data as EscalaDia;
                        return (
                          <div
                            key={`e-${idx}`}
                            className="text-[10px] px-1 py-0.5 rounded truncate"
                            style={{ background: `${color}22`, color }}
                          >
                            {nome.split(" ")[0]} {e.ausente ? "(AUS)" : (e.hora_inicio?.slice(0, 5) ?? "")}
                          </div>
                        );
                      })}
                      {events.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{events.length - 3}</div>
                      )}
                    </button>
                  </PopoverTrigger>
                  {events.length > 0 && (
                    <PopoverContent className="w-80">
                      <div className="font-semibold mb-2 capitalize">
                        {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {events.map((ev, idx) => {
                          const userId = ev.data.user_id;
                          const nome = profileMap.get(userId)?.nome ?? "Desconhecido";
                          const color = colorForUser(userId);
                          if (ev.type === "ferias") {
                            return (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: color }} />
                                <div>
                                  <div className="font-medium">{nome}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Férias ({ev.data.periodo}º período)
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          const e = ev.data as EscalaDia;
                          return (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: color }} />
                              <div>
                                <div className="font-medium">{nome}</div>
                                {e.ausente ? (
                                  <div className="text-xs text-orange-600">
                                    {(e.tipo_ausencia ?? "ausente").toUpperCase()}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    {e.hora_inicio?.slice(0, 5)}–{e.hora_fim?.slice(0, 5)}
                                    {e.local ? ` · ${e.local}` : ""}
                                  </div>
                                )}
                                {e.observacao && (
                                  <div className="text-xs text-muted-foreground italic">{e.observacao}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminCalendario;
