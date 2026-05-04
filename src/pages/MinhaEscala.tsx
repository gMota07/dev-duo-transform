import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, CalendarDays, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ano: number;
  periodo: number;
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
}

interface TurnoForm {
  hora_inicio: string;
  hora_fim: string;
  local: string;
  observacao: string;
  ausente: boolean;
  tipo_ausencia: string;
}

const emptyTurno = (): TurnoForm => ({
  hora_inicio: "08:00",
  hora_fim: "18:00",
  local: "",
  observacao: "",
  ausente: false,
  tipo_ausencia: "folga",
});

const MinhaEscala = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [escalas, setEscalas] = useState<EscalaDia[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Diálogo de edição de dia
  const [editDay, setEditDay] = useState<Date | null>(null);
  const [turnos, setTurnos] = useState<TurnoForm[]>([emptyTurno()]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [currentMonth]);

  // Padding para começar na segunda
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7;
  const calendarCells: (Date | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...daysInMonth,
  ];

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [esc, fer] = await Promise.all([
        supabase
          .from("escalas_dia")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", format(monthStart, "yyyy-MM-dd"))
          .lte("data", format(monthEnd, "yyyy-MM-dd"))
          .order("data")
          .order("ordem"),
        supabase
          .from("ferias")
          .select("*")
          .eq("user_id", user.id)
          .order("ano", { ascending: false })
          .order("periodo"),
      ]);
      if (esc.error) throw esc.error;
      if (fer.error) throw fer.error;
      setEscalas(esc.data ?? []);
      setFerias(fer.data ?? []);
    } catch (err) {
      toast.error("Erro ao carregar", { description: friendlyError(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, currentMonth]);

  const escalasByDay = useMemo(() => {
    const map = new Map<string, EscalaDia[]>();
    for (const e of escalas) {
      const key = e.data;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [escalas]);

  const isFeriasDay = (day: Date) => {
    const d = startOfDay(day);
    return ferias.some((f) => {
      const start = startOfDay(parseISO(f.data_inicio));
      const end = startOfDay(parseISO(f.data_fim));
      return d >= start && d <= end;
    });
  };

  const openDayEditor = (day: Date) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const existing = escalasByDay.get(dayKey) ?? [];
    if (existing.length > 0) {
      setTurnos(
        existing.map((e) => ({
          hora_inicio: e.hora_inicio?.slice(0, 5) ?? "08:00",
          hora_fim: e.hora_fim?.slice(0, 5) ?? "18:00",
          local: e.local ?? "",
          observacao: e.observacao ?? "",
          ausente: e.ausente,
          tipo_ausencia: e.tipo_ausencia ?? "folga",
        })),
      );
    } else {
      setTurnos([emptyTurno()]);
    }
    setEditDay(day);
  };

  const saveDay = async () => {
    if (!user || !editDay) return;
    setSaving(true);
    try {
      const dayKey = format(editDay, "yyyy-MM-dd");
      // Apaga existentes do dia e reinsere
      const del = await supabase.from("escalas_dia").delete().eq("user_id", user.id).eq("data", dayKey);
      if (del.error) throw del.error;

      const rows = turnos.map((t, idx) => ({
        user_id: user.id,
        data: dayKey,
        ordem: idx + 1,
        hora_inicio: t.ausente ? null : t.hora_inicio,
        hora_fim: t.ausente ? null : t.hora_fim,
        local: t.ausente ? null : (t.local || null),
        observacao: t.observacao || null,
        ausente: t.ausente,
        tipo_ausencia: t.ausente ? t.tipo_ausencia : null,
      }));
      if (rows.length > 0) {
        const ins = await supabase.from("escalas_dia").insert(rows);
        if (ins.error) throw ins.error;
      }
      toast.success("Escala salva");
      setEditDay(null);
      load();
    } catch (err) {
      toast.error("Erro ao salvar", { description: friendlyError(err) });
    } finally {
      setSaving(false);
    }
  };

  const removeDay = async () => {
    if (!user || !editDay) return;
    setSaving(true);
    try {
      const dayKey = format(editDay, "yyyy-MM-dd");
      const del = await supabase.from("escalas_dia").delete().eq("user_id", user.id).eq("data", dayKey);
      if (del.error) throw del.error;
      toast.success("Dia limpo");
      setEditDay(null);
      load();
    } catch (err) {
      toast.error("Erro ao remover", { description: friendlyError(err) });
    } finally {
      setSaving(false);
    }
  };

  // Repetir última semana como padrão
  const replicateLastWeek = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Busca os últimos 7 dias com escala
      const { data, error } = await supabase
        .from("escalas_dia")
        .select("*")
        .eq("user_id", user.id)
        .lt("data", format(monthStart, "yyyy-MM-dd"))
        .order("data", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info("Sem escala anterior para replicar");
        return;
      }
      // Pega a última semana (segunda a domingo)
      const lastDate = parseISO(data[0].data);
      const lastWeekStart = new Date(lastDate);
      lastWeekStart.setDate(lastDate.getDate() - ((lastDate.getDay() + 6) % 7));
      const lastWeek = data.filter((e) => {
        const d = parseISO(e.data);
        return d >= lastWeekStart;
      });
      const byWeekday = new Map<number, typeof lastWeek>();
      for (const e of lastWeek) {
        const wd = parseISO(e.data).getDay();
        if (!byWeekday.has(wd)) byWeekday.set(wd, []);
        byWeekday.get(wd)!.push(e);
      }

      // Aplica em todos os dias do mês atual que estão vazios
      const novasRows: any[] = [];
      for (const day of daysInMonth) {
        const dayKey = format(day, "yyyy-MM-dd");
        if (escalasByDay.has(dayKey)) continue;
        const wd = day.getDay();
        const template = byWeekday.get(wd);
        if (!template) continue;
        template.forEach((t, idx) => {
          novasRows.push({
            user_id: user.id,
            data: dayKey,
            ordem: idx + 1,
            hora_inicio: t.hora_inicio,
            hora_fim: t.hora_fim,
            local: t.local,
            observacao: t.observacao,
            ausente: t.ausente,
            tipo_ausencia: t.tipo_ausencia,
          });
        });
      }
      if (novasRows.length === 0) {
        toast.info("Mês já está preenchido");
        return;
      }
      const ins = await supabase.from("escalas_dia").insert(novasRows);
      if (ins.error) throw ins.error;
      toast.success(`${novasRows.length} turno(s) replicado(s)`);
      load();
    } catch (err) {
      toast.error("Erro ao replicar", { description: friendlyError(err) });
    } finally {
      setSaving(false);
    }
  };

  const renderDayContent = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const items = escalasByDay.get(key) ?? [];
    const onFerias = isFeriasDay(day);
    return (
      <>
        {onFerias && (
          <div className="text-[10px] px-1 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 truncate">
            Férias
          </div>
        )}
        {items.slice(0, 2).map((it) => (
          <div
            key={it.id}
            className={cn(
              "text-[10px] px-1 py-0.5 rounded truncate",
              it.ausente
                ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
                : "bg-primary/15 text-primary",
            )}
          >
            {it.ausente
              ? (it.tipo_ausencia ?? "AUSENTE").toUpperCase()
              : `${it.hora_inicio?.slice(0, 5) ?? ""}${it.local ? " " + it.local : ""}`}
          </div>
        ))}
        {items.length > 2 && (
          <div className="text-[10px] text-muted-foreground">+{items.length - 2}</div>
        )}
      </>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Minha Escala</h1>
          <p className="text-muted-foreground mt-1">Informe seu local e horário da semana</p>
        </div>
      </div>

      <Tabs defaultValue="escala">
        <TabsList>
          <TabsTrigger value="escala"><CalendarDays className="h-4 w-4 mr-2" /> Escala</TabsTrigger>
          <TabsTrigger value="ferias"><Plane className="h-4 w-4 mr-2" /> Férias</TabsTrigger>
        </TabsList>

        <TabsContent value="escala" className="mt-4">
          <Card className="p-4 mb-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Clique em um dia para preencher seus turnos. Use <strong>"Repetir última semana"</strong> para
              copiar sua rotina anterior nos dias vazios deste mês.
            </p>
          </Card>

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
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
                  Hoje
                </Button>
                <Button size="sm" onClick={replicateLastWeek} disabled={saving}>
                  Repetir última semana
                </Button>
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
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => openDayEditor(day)}
                      className={cn(
                        "min-h-[80px] p-1.5 rounded border text-left flex flex-col gap-0.5 transition-colors hover:bg-accent",
                        isSameMonth(day, currentMonth) ? "bg-card" : "bg-muted/40 opacity-60",
                        isToday && "ring-2 ring-primary",
                      )}
                    >
                      <div className="text-xs font-semibold">{format(day, "d")}</div>
                      {renderDayContent(day)}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ferias" className="mt-4">
          <FeriasManager
            ferias={ferias}
            userId={user?.id ?? ""}
            onChanged={load}
          />
        </TabsContent>
      </Tabs>

      {/* Diálogo de edição de dia */}
      <Dialog open={!!editDay} onOpenChange={(o) => !o && setEditDay(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDay && format(editDay, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {turnos.map((t, idx) => (
              <Card key={idx} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Turno {idx + 1}</span>
                  {turnos.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTurnos(turnos.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={t.ausente}
                    onCheckedChange={(v) =>
                      setTurnos(turnos.map((x, i) => (i === idx ? { ...x, ausente: v } : x)))
                    }
                  />
                  <Label className="cursor-pointer">Ausente neste turno</Label>
                </div>

                {t.ausente ? (
                  <div className="space-y-2">
                    <Label>Tipo de ausência</Label>
                    <Select
                      value={t.tipo_ausencia}
                      onValueChange={(v) =>
                        setTurnos(turnos.map((x, i) => (i === idx ? { ...x, tipo_ausencia: v } : x)))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="folga">Folga</SelectItem>
                        <SelectItem value="compensacao">Compensação</SelectItem>
                        <SelectItem value="atestado">Atestado</SelectItem>
                        <SelectItem value="ausente">Ausente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Hora início</Label>
                        <Input
                          type="time"
                          value={t.hora_inicio}
                          onChange={(e) =>
                            setTurnos(turnos.map((x, i) => (i === idx ? { ...x, hora_inicio: e.target.value } : x)))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hora fim</Label>
                        <Input
                          type="time"
                          value={t.hora_fim}
                          onChange={(e) =>
                            setTurnos(turnos.map((x, i) => (i === idx ? { ...x, hora_fim: e.target.value } : x)))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Local</Label>
                      <Input
                        placeholder="Ex: Escritório, Obra Sede Galícia"
                        value={t.local}
                        onChange={(e) =>
                          setTurnos(turnos.map((x, i) => (i === idx ? { ...x, local: e.target.value } : x)))
                        }
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Observação (opcional)</Label>
                  <Textarea
                    rows={2}
                    value={t.observacao}
                    onChange={(e) =>
                      setTurnos(turnos.map((x, i) => (i === idx ? { ...x, observacao: e.target.value } : x)))
                    }
                  />
                </div>
              </Card>
            ))}

            <Button variant="outline" className="w-full" onClick={() => setTurnos([...turnos, emptyTurno()])}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar outro turno
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={removeDay} disabled={saving}>
              Limpar dia
            </Button>
            <Button onClick={saveDay} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============== Gerenciador de Férias ==============
const FeriasManager = ({
  ferias,
  userId,
  onChanged,
}: {
  ferias: Ferias[];
  userId: string;
  onChanged: () => void;
}) => {
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const [saving, setSaving] = useState(false);

  const periodos = [1, 2, 3, 4];
  const byPeriodo = new Map(ferias.filter((f) => f.ano === ano).map((f) => [f.periodo, f]));

  const [draft, setDraft] = useState<Record<number, { inicio: string; fim: string; obs: string }>>({});

  useEffect(() => {
    const next: typeof draft = {};
    for (const p of periodos) {
      const f = byPeriodo.get(p);
      next[p] = {
        inicio: f?.data_inicio ?? "",
        fim: f?.data_fim ?? "",
        obs: f?.observacao ?? "",
      };
    }
    setDraft(next);
  }, [ano, ferias]);

  const savePeriodo = async (p: number) => {
    if (!userId) return;
    const d = draft[p];
    if (!d?.inicio || !d?.fim) {
      toast.error("Preencha início e fim");
      return;
    }
    setSaving(true);
    try {
      const existing = byPeriodo.get(p);
      if (existing) {
        const { error } = await supabase
          .from("ferias")
          .update({ data_inicio: d.inicio, data_fim: d.fim, observacao: d.obs || null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ferias").insert({
          user_id: userId,
          ano,
          periodo: p,
          data_inicio: d.inicio,
          data_fim: d.fim,
          observacao: d.obs || null,
        });
        if (error) throw error;
      }
      toast.success(`Período ${p} salvo`);
      onChanged();
    } catch (err) {
      toast.error("Erro ao salvar", { description: friendlyError(err) });
    } finally {
      setSaving(false);
    }
  };

  const deletePeriodo = async (p: number) => {
    const existing = byPeriodo.get(p);
    if (!existing) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("ferias").delete().eq("id", existing.id);
      if (error) throw error;
      toast.success(`Período ${p} removido`);
      onChanged();
    } catch (err) {
      toast.error("Erro ao remover", { description: friendlyError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Use esta seção apenas para registrar afastamentos e férias.
          <strong> Preencha apenas após validação das datas com o seu gestor.</strong>
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <Label>Ano:</Label>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {periodos.map((p) => {
          const exists = byPeriodo.has(p);
          return (
            <Card key={p} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {p}º Período {p === 1 && <span className="text-xs text-destructive">*</span>}
                </h3>
                {exists && (
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">
                    Registrado
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="date"
                    value={draft[p]?.inicio ?? ""}
                    onChange={(e) => setDraft({ ...draft, [p]: { ...draft[p], inicio: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Término</Label>
                  <Input
                    type="date"
                    value={draft[p]?.fim ?? ""}
                    onChange={(e) => setDraft({ ...draft, [p]: { ...draft[p], fim: e.target.value } })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observação</Label>
                <Input
                  value={draft[p]?.obs ?? ""}
                  onChange={(e) => setDraft({ ...draft, [p]: { ...draft[p], obs: e.target.value } })}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => savePeriodo(p)} disabled={saving} className="flex-1">
                  Salvar
                </Button>
                {exists && (
                  <Button size="sm" variant="outline" onClick={() => deletePeriodo(p)} disabled={saving}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MinhaEscala;
