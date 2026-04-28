/**
 * EXEMPLO DE INTEGRAÇÃO - Como usar o sistema de notificações por e-mail
 * 
 * Este arquivo demonstra como integrar as funcionalidades de e-mail
 * em diferentes partes da aplicação.
 */

// ============================================
// EXEMPLO 1: Em um Componente de Detalhes de Demanda
// ============================================

import { useEffect, useState } from "react";
import { EmailHistoryComponent } from "@/components/EmailHistoryComponent";
import { sendDemandaEmailNotification } from "@/lib/email-notifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";

interface DemandaDetalheComEmailProps {
  demandaId: string;
}

export const DemandaDetalheComEmail = ({
  demandaId,
}: DemandaDetalheComEmailProps) => {
  const [showEmailHistory, setShowEmailHistory] = useState(false);

  return (
    <div className="space-y-6">
      {/* Conteúdo da demanda */}
      <Card className="p-6">
        {/* ... outros dados da demanda ... */}
      </Card>

      {/* Seção de Notificações por E-mail */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Notificações por E-mail</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailHistory(!showEmailHistory)}
          >
            <Mail className="h-4 w-4 mr-2" />
            {showEmailHistory ? "Ocultar" : "Ver Histórico"}
          </Button>
        </div>

        {showEmailHistory && (
          <EmailHistoryComponent demandaId={demandaId} />
        )}
      </Card>
    </div>
  );
};

// ============================================
// EXEMPLO 2: Em um Componente de Status Selector
// ============================================

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface StatusSelectorComEmailProps {
  demandaId: string;
  statusAtual: string;
  onStatusChange: (novoStatus: string) => Promise<void>;
}

export const StatusSelectorComEmail = ({
  demandaId,
  statusAtual,
  onStatusChange,
}: StatusSelectorComEmailProps) => {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (novoStatus: string) => {
    setLoading(true);
    try {
      // Alterar status na demanda
      await onStatusChange(novoStatus);

      // O trigger do banco vai disparar automaticamente o e-mail
      // Mas você pode também enviar manualmente após confirmar a alteração
      toast.success("Status alterado com sucesso!");

      // Opcional: Esperar 2 segundos e verificar se o e-mail foi enviado
      setTimeout(async () => {
        // Aqui você poderia recarregar o histórico de e-mails
        console.log("E-mail de notificação foi disparado automaticamente");
      }, 2000);
    } catch (error) {
      toast.error("Erro ao alterar status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Status</label>
      <Select value={statusAtual} onValueChange={handleStatusChange} disabled={loading}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="aberto">Aberto</SelectItem>
          <SelectItem value="em_execucao">Em Andamento</SelectItem>
          <SelectItem value="impedido">Impedido</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
          <SelectItem value="concluido">Concluído</SelectItem>
        </SelectContent>
      </Select>
      {loading && <p className="text-xs text-muted-foreground">Enviando notificação...</p>}
    </div>
  );
};

// ============================================
// EXEMPLO 3: Em uma Página Admin de Demandas
// ============================================

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AdminDemandaLineItemProps {
  demanda: any;
  onStatusChange: (demandaId: string, novoStatus: string) => Promise<void>;
}

export const AdminDemandaLineItemComEmail = ({
  demanda,
  onStatusChange,
}: AdminDemandaLineItemProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirmStatusChange = async () => {
    if (!selectedStatus) return;

    setLoading(true);
    try {
      await onStatusChange(demanda.id, selectedStatus);

      toast.success("Status alterado e notificação enviada!");
      setShowConfirmDialog(false);
      setSelectedStatus(null);

      // Recarregar dados da demanda se necessário
    } catch (error) {
      toast.error("Erro ao alterar status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 border rounded">
        <div className="flex-1">
          <h4 className="font-medium">{demanda.titulo}</h4>
          <p className="text-sm text-muted-foreground">ID: {demanda.id}</p>
        </div>

        <Select
          value={demanda.status}
          onValueChange={(novoStatus) => {
            setSelectedStatus(novoStatus);
            setShowConfirmDialog(true);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_execucao">Em Andamento</SelectItem>
            <SelectItem value="impedido">Impedido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Diálogo de Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Status</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente alterar o status para "{selectedStatus}"? 
              Um e-mail de notificação será enviado para o solicitante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <p className="text-sm font-medium">Demanda: {demanda.titulo}</p>
            <p className="text-xs text-muted-foreground">
              E-mail será enviado para: {demanda.profiles?.email}
            </p>
          </div>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusChange} disabled={loading}>
              {loading ? "Enviando..." : "Confirmar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ============================================
// EXEMPLO 4: Hook Customizado para Gerenciar Demanda com Email
// ============================================

/**
 * Hook que encapsula toda a lógica de alteração de status com notificação por e-mail
 */
export const useDemandaWithEmailNotification = (demandaId: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const alterarStatusComNotificacao = async (novoStatus: string) => {
    setLoading(true);
    setError(null);
    setEmailSent(false);

    try {
      // 1. Alterar status da demanda
      const { error: updateError } = await supabase
        .from("demandas")
        .update({ status: novoStatus })
        .eq("id", demandaId);

      if (updateError) throw updateError;

      // 2. O trigger vai disparar automaticamente, mas podemos também verificar
      // Esperar um pouco para a edge function processar
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setEmailSent(true);
      toast.success("Status alterado e e-mail enviado!");

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      toast.error("Erro ao alterar status", { description: msg });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    alterarStatusComNotificacao,
    loading,
    error,
    emailSent,
  };
};

// Uso do hook:
// const { alterarStatusComNotificacao, loading } = useDemandaWithEmailNotification(demandaId);
// await alterarStatusComNotificacao("em_execucao");

// ============================================
// EXEMPLO 5: Integração Completa em Página de Demanda
// ============================================

interface DemandaDetalhePageProps {
  demandaId: string;
}

export const DemandaDetalhePage = ({ demandaId }: DemandaDetalhePageProps) => {
  const [demanda, setDemanda] = useState<any>(null);
  const { alterarStatusComNotificacao, loading } = useDemandaWithEmailNotification(demandaId);

  const handleStatusChange = async (novoStatus: string) => {
    const success = await alterarStatusComNotificacao(novoStatus);
    if (success) {
      // Recarregar dados da demanda
      const { data } = await supabase
        .from("demandas")
        .select("*")
        .eq("id", demandaId)
        .single();

      if (data) setDemanda(data);
    }
  };

  if (!demanda) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Informações da Demanda */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">{demanda.titulo}</h2>
        <p className="text-muted-foreground mb-6">{demanda.descricao}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={demanda.status} onValueChange={handleStatusChange} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_execucao">Em Andamento</SelectItem>
                <SelectItem value="impedido">Impedido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Urgência</label>
            <p className="mt-2 text-sm">{demanda.urgencia}</p>
          </div>
        </div>
      </Card>

      {/* Histórico de E-mails */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Histórico de Notificações</h3>
        <EmailHistoryComponent demandaId={demandaId} />
      </Card>
    </div>
  );
};
