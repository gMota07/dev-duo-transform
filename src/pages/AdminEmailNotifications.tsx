import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Send, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendDemandaEmailNotification, retryFailedEmailNotification } from "@/lib/email-notifications";
import { toast } from "sonner";

const AdminEmailNotifications = () => {
  const navigate = useNavigate();
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [demandaFilter, setDemandaFilter] = useState("");
  const [testDemandaId, setTestDemandaId] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    carregarLogs();
    // Recarregar a cada 10 segundos
    const interval = setInterval(carregarLogs, 10000);
    return () => clearInterval(interval);
  }, [demandaFilter]);

  const carregarLogs = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("demanda_email_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (demandaFilter) {
        query = query.eq("demanda_id", demandaFilter);
      }

      const { data, error } = await query;

      if (error) {
        toast.error("Erro ao carregar logs");
        console.error(error);
      } else {
        setEmailLogs(data || []);
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarTestEmail = async () => {
    if (!testDemandaId.trim()) {
      toast.error("Digite o ID da demanda");
      return;
    }

    setSendingTest(true);
    const success = await sendDemandaEmailNotification(testDemandaId, true);
    if (success) {
      setTestDemandaId("");
      setTimeout(carregarLogs, 2000);
    }
    setSendingTest(false);
  };

  const handleRetry = async (logId: string, demandaId: string) => {
    const success = await retryFailedEmailNotification(logId, demandaId);
    if (success) {
      setTimeout(carregarLogs, 2000);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeColor = (log: any) => {
    if (log.erro_envio) return "destructive";
    return "default";
  };

  const getStatusText = (log: any) => {
    if (log.erro_envio) return "Falha";
    return "Enviado";
  };

  const stats = {
    total: emailLogs.length,
    enviados: emailLogs.filter((l) => !l.erro_envio).length,
    falhas: emailLogs.filter((l) => l.erro_envio).length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Notificações por E-mail</h1>
        <p className="text-muted-foreground">
          Monitore e gerencie o envio automático de e-mails para alterações de status
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de E-mails</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Mail className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Enviados com Sucesso</p>
              <p className="text-2xl font-bold text-green-600">{stats.enviados}</p>
            </div>
            <Mail className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Com Falha</p>
              <p className="text-2xl font-bold text-red-600">{stats.falhas}</p>
            </div>
            <Mail className="h-8 w-8 text-red-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Área de Teste */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Enviar E-mail de Teste</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="test-demanda">ID da Demanda</Label>
            <Input
              id="test-demanda"
              placeholder="Cole o UUID da demanda"
              value={testDemandaId}
              onChange={(e) => setTestDemandaId(e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleEnviarTestEmail}
              disabled={sendingTest || !testDemandaId}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendingTest ? "Enviando..." : "Enviar Teste"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="filter-demanda">Filtrar por ID da Demanda</Label>
            <Input
              id="filter-demanda"
              placeholder="Cole o UUID para filtrar"
              value={demandaFilter}
              onChange={(e) => setDemandaFilter(e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setDemandaFilter("")}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Histórico de E-mails</h2>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando dados...
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum e-mail encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Demanda ID</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {log.demanda_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">{log.destinatario_email}</TableCell>
                      <TableCell className="text-sm">{log.tipo_notificacao}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeColor(log)}>
                          {getStatusText(log)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {log.erro_envio && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetry(log.id, log.demanda_id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <span
                                className="text-xs text-red-600 cursor-help"
                                title={log.erro_envio}
                              >
                                Ver erro
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* Documentação */}
      <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2 text-blue-900">ℹ️ Informações</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>E-mails são enviados automaticamente quando o status da demanda é alterado</li>
          <li>Status que disparam notificação: "Em Andamento", "Concluída", "Cancelada", "Impedida"</li>
          <li>Use a área de teste para enviar e-mails manualmente</li>
          <li>Falhas de envio são automaticamente registradas e podem ser retentadas</li>
        </ul>
      </Card>
    </div>
  );
};

export default AdminEmailNotifications;
