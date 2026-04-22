import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { URGENCIA_OPTIONS } from "@/components/StatusBadge";
import { ArrowLeft, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { friendlyError, validateFile, sanitizeFileName, ALLOWED_FILE_TYPES } from "@/lib/errors";

interface Categoria { id: string; nome: string }
interface Subcategoria { id: string; nome: string; categoria_id: string }

const NovaDemanda = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [urgencia, setUrgencia] = useState("media");
  const [prazo, setPrazo] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [cats, subs] = await Promise.all([
        supabase.from("categorias").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("subcategorias").select("id, nome, categoria_id").eq("ativo", true).order("nome"),
      ]);
      setCategorias(cats.data ?? []);
      setSubcategorias(subs.data ?? []);
    };
    load();
  }, []);

  const subsFiltradas = subcategorias.filter((s) => s.categoria_id === categoriaId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { data: demanda, error } = await supabase
        .from("demandas")
        .insert({
          titulo,
          descricao,
          categoria_id: categoriaId || null,
          subcategoria_id: subcategoriaId || null,
          urgencia: urgencia as any,
          prazo_desejado: prazo || null,
          solicitante_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload de anexos
      for (const file of files) {
        const path = `${user.id}/${demanda.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from("demanda-anexos")
          .upload(path, file);
        if (upErr) {
          console.error("[upload]", upErr);
          toast.error(`Falha ao anexar ${file.name}`);
          continue;
        }
        await supabase.from("demanda_anexos").insert({
          demanda_id: demanda.id,
          storage_path: path,
          nome_arquivo: file.name,
          tamanho_bytes: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        });
      }

      toast.success("Demanda criada com sucesso!");
      navigate("/");
    } catch (err: unknown) {
      toast.error("Erro ao criar demanda", { description: friendlyError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <h1 className="text-3xl font-bold mb-2">Nova Demanda</h1>
      <p className="text-muted-foreground mb-8">Descreva sua solicitação com detalhes</p>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumo curto do que precisa"
              required
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={categoriaId} onValueChange={(v) => { setCategoriaId(v); setSubcategoriaId(""); }} required>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select value={subcategoriaId} onValueChange={setSubcategoriaId} disabled={!categoriaId || subsFiltradas.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={subsFiltradas.length === 0 ? "Sem subcategorias" : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {subsFiltradas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgência *</Label>
              <Select value={urgencia} onValueChange={setUrgencia} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCIA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo desejado</Label>
              <Input
                id="prazo"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva detalhadamente o que precisa, contexto, e qualquer informação relevante..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Anexos</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <label className="flex flex-col items-center justify-center gap-1 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  <span>Clique para adicionar arquivos</span>
                </div>
                <span className="text-xs">PDF, DOC, XLS, imagens · até 10 MB cada</span>
                <input
                  type="file"
                  multiple
                  accept={ALLOWED_FILE_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    const valid: File[] = [];
                    for (const f of selected) {
                      const err = validateFile(f);
                      if (err) toast.error(err);
                      else valid.push(f);
                    }
                    setFiles(valid);
                  }}
                />
              </label>
              {files.length > 0 && (
                <div className="mt-3 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 px-3 py-1.5 rounded text-sm">
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="gradient-primary flex-1" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar demanda
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NovaDemanda;
