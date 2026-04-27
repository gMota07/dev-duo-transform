import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Perfil = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Alterar senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmaSenha, setMostrarConfirmaSenha] = useState(false);

  const handleAlterarSenha = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!senhaAtual.trim()) {
      toast.error("Digite sua senha atual");
      return;
    }
    
    if (!novaSenha.trim()) {
      toast.error("Digite a nova senha");
      return;
    }
    
    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    if (novaSenha !== confirmaSenha) {
      toast.error("As senhas não conferem");
      return;
    }
    
    if (novaSenha === senhaAtual) {
      toast.error("A nova senha deve ser diferente da atual");
      return;
    }

    setLoading(true);
    try {
      // Primeiro valida a senha atual tentando fazer login
      if (!user?.email) throw new Error("Email não encontrado");
      
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      });
      
      if (loginError) {
        toast.error("Senha atual incorreta");
        setLoading(false);
        return;
      }

      // Se chegou aqui, a senha está correta. Agora altera para a nova
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateError) {
        toast.error("Erro ao alterar senha", { description: updateError.message });
        return;
      }

      toast.success("Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmaSenha("");
    } catch (err: any) {
      toast.error("Erro ao alterar senha", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações e segurança</p>
      </div>

      {/* Dados Pessoais */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações Pessoais</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              type="text"
              value={profile?.nome ?? ""}
              readOnly
              className="bg-muted"
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="bg-muted"
            />
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Para alterar seu nome ou email, contate o administrador do sistema.
          </p>
        </div>
      </Card>

      {/* Alterar Senha */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Alterar Senha</h2>
        
        <form onSubmit={handleAlterarSenha} className="space-y-4">
          {/* Senha Atual */}
          <div>
            <Label htmlFor="senhaAtual">Senha Atual</Label>
            <div className="relative">
              <Input
                id="senhaAtual"
                type={mostrarSenhaAtual ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {mostrarSenhaAtual ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div>
            <Label htmlFor="novaSenha">Nova Senha</Label>
            <div className="relative">
              <Input
                id="novaSenha"
                type={mostrarNovaSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite uma nova senha (mínimo 6 caracteres)"
              />
              <button
                type="button"
                onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {mostrarNovaSenha ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div>
            <Label htmlFor="confirmaSenha">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmaSenha"
                type={mostrarConfirmaSenha ? "text" : "password"}
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                placeholder="Confirme a nova senha"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmaSenha(!mostrarConfirmaSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {mostrarConfirmaSenha ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            • Mínimo de 6 caracteres
            <br />
            • Deve ser diferente da senha atual
          </p>

          <Button type="submit" className="gradient-primary w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Alterar Senha
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Perfil;
