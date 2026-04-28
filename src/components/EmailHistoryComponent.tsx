import { useEffect, useState } from "react";
import { Mail, Check, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDemandaEmailHistory,
  retryFailedEmailNotification,
  STATUS_LABELS,
} from "@/lib/email-notifications";
import { toast } from "sonner";

interface EmailHistoryProps {
  demandaId: string;
}

export const EmailHistoryComponent = ({ demandaId }: EmailHistoryProps) => {
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    carregarHistorico();
    // Recarregar a cada 30 segundos
    const interval = setInterval(carregarHistorico, 30000);
    return () => clearInterval(interval);
  }, [demandaId]);

  const carregarHistorico = async () => {
    setLoading(true);
    const logs = await getDemandaEmailHistory(demandaId);
    setEmailLogs(logs);
    setLoading(false);
  };

  const handleRetry = async (logId: string) => {
    const success = await retryFailedEmailNotification(logId, demandaId);
    if (success) {
      await carregarHistorico();
    }
  };

  const getStatusIcon = (log: any) => {
    if (log.erro_envio) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <Check className="h-5 w-5 text-green-500" />;
  };

  const getStatusBadge = (log: any) => {
    if (log.erro_envio) {
      return <Badge variant="destructive">Falha</Badge>;
    }
    return <Badge variant="default">Enviado</Badge>;
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

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando histórico...</div>;
  }

  if (emailLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum e-mail enviado ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Tipo de Notificação</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-center">{getStatusIcon(log)}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{getStatusBadge(log)}</p>
                    <p className="text-xs text-muted-foreground">{log.tipo_notificacao}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{log.destinatario_email}</TableCell>
                <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      Ver detalhes
                    </Button>
                    {log.erro_envio && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetry(log.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Retentar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de detalhes */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do E-mail</DialogTitle>
            <DialogDescription>
              Visualize os dados completos do e-mail enviado
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Assunto</label>
                <p className="text-sm bg-muted p-2 rounded mt-1">{selectedLog.assunto}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Destinatário</label>
                <p className="text-sm bg-muted p-2 rounded mt-1">{selectedLog.destinatario_email}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Notificação</label>
                <p className="text-sm bg-muted p-2 rounded mt-1">{selectedLog.tipo_notificacao}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Status da Demanda</label>
                <p className="text-sm bg-muted p-2 rounded mt-1">
                  {STATUS_LABELS[selectedLog.status_demanda_trigger]?.label || selectedLog.status_demanda_trigger}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Data/Hora de Envio</label>
                <p className="text-sm bg-muted p-2 rounded mt-1">
                  {formatDate(selectedLog.enviado_em)}
                </p>
              </div>

              {selectedLog.erro_envio && (
                <div>
                  <label className="text-sm font-medium text-red-600">Erro</label>
                  <p className="text-sm bg-red-50 border border-red-200 p-2 rounded mt-1 text-red-800">
                    {selectedLog.erro_envio}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Corpo do E-mail (HTML)</label>
                <div className="bg-muted p-2 rounded mt-1 max-h-48 overflow-y-auto">
                  <iframe
                    srcDoc={selectedLog.corpo_email}
                    className="w-full border rounded"
                    style={{ minHeight: "200px" }}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
