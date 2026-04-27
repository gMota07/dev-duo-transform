import { useState, FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error });
    } else {
      toast.success("Bem-vindo!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-soft">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <img src="/logo.png" alt="Logo" className="h-16 mx-auto"/>
            <p className="text-muted-foreground mt-2">Sistema de Demandas</p>
        </div>

        <Card className="p-8 shadow-elegant border-border/50">
          <h2 className="text-xl font-semibold mb-1">Acessar sistema</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Entre com suas credenciais corporativas
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.nome@fsconsultores.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Não tem acesso? Solicite ao administrador do sistema.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
