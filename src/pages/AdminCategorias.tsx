import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Categoria { id: string; nome: string }
interface Subcategoria { id: string; nome: string; categoria_id: string }

const AdminCategorias = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [novaSub, setNovaSub] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      supabase.from("categorias").select("*").order("nome"),
      supabase.from("subcategorias").select("*").order("nome"),
    ]);
    setCategorias(c.data ?? []);
    setSubcategorias(s.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addCategoria = async () => {
    if (!novaCategoria.trim()) return;
    const { error } = await supabase.from("categorias").insert({ nome: novaCategoria.trim() });
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    setNovaCategoria("");
    toast.success("Categoria criada");
    load();
  };

  const deleteCategoria = async (id: string) => {
    if (!confirm("Excluir esta categoria? As subcategorias também serão removidas.")) return;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Categoria removida");
    load();
  };

  const addSub = async (categoriaId: string) => {
    const nome = novaSub[categoriaId]?.trim();
    if (!nome) return;
    const { error } = await supabase.from("subcategorias").insert({ categoria_id: categoriaId, nome });
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setNovaSub({ ...novaSub, [categoriaId]: "" });
    toast.success("Subcategoria criada");
    load();
  };

  const deleteSub = async (id: string) => {
    const { error } = await supabase.from("subcategorias").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Subcategoria removida");
    load();
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandidas);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandidas(next);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Categorias</h1>
        <p className="text-muted-foreground mt-1">
          Organize as categorias e subcategorias das demandas
        </p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova categoria"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategoria()}
          />
          <Button onClick={addCategoria} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" /> Adicionar
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {categorias.map((c) => {
            const subs = subcategorias.filter((s) => s.categoria_id === c.id);
            const isOpen = expandidas.has(c.id);
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => toggleExpand(c.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-semibold">{c.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      ({subs.length} {subs.length === 1 ? "subcategoria" : "subcategorias"})
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCategoria(c.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 border-t bg-muted/20">
                    <div className="flex gap-2 my-3">
                      <Input
                        placeholder="Nova subcategoria"
                        value={novaSub[c.id] ?? ""}
                        onChange={(e) => setNovaSub({ ...novaSub, [c.id]: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && addSub(c.id)}
                      />
                      <Button size="sm" onClick={() => addSub(c.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {subs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Nenhuma subcategoria cadastrada.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {subs.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between bg-background px-3 py-2 rounded text-sm"
                          >
                            <span>{s.nome}</span>
                            <button
                              onClick={() => deleteSub(s.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCategorias;
