import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  aberto: { label: "Aberto", class: "bg-status-aberto/15 text-status-aberto border-status-aberto/30" },
  em_execucao: { label: "Em execução", class: "bg-status-execucao/15 text-status-execucao border-status-execucao/30" },
  impedido: { label: "Impedido", class: "bg-status-impedido/15 text-status-impedido border-status-impedido/30" },
  cancelado: { label: "Cancelado", class: "bg-status-cancelado/15 text-status-cancelado border-status-cancelado/30" },
  concluido: { label: "Concluído", class: "bg-status-concluido/15 text-status-concluido border-status-concluido/30" },
} as const;

const urgenciaConfig = {
  baixa: { label: "Baixa", class: "bg-muted text-muted-foreground" },
  media: { label: "Média", class: "bg-secondary/15 text-secondary border-secondary/30" },
  alta: { label: "Alta", class: "bg-warning/15 text-warning border-warning/30" },
  critica: { label: "Crítica", class: "bg-destructive/15 text-destructive border-destructive/30" },
} as const;

export const StatusBadge = ({ status }: { status: keyof typeof statusConfig }) => {
  const cfg = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("font-medium", cfg.class)}>
      {cfg.label}
    </Badge>
  );
};

export const UrgenciaBadge = ({ urgencia }: { urgencia: keyof typeof urgenciaConfig }) => {
  const cfg = urgenciaConfig[urgencia];
  return (
    <Badge variant="outline" className={cn("font-medium", cfg.class)}>
      {cfg.label}
    </Badge>
  );
};

export const STATUS_OPTIONS = Object.entries(statusConfig).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

export const URGENCIA_OPTIONS = Object.entries(urgenciaConfig).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));
