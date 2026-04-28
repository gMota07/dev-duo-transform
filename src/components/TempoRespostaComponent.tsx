import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, AlertCircle } from "lucide-react";
import {
  formatarTempoResposta,
  formatarTempoRespostaLongo,
  getCorTempoResposta,
  calcularSLA,
} from "@/lib/response-time";

interface TempoRespostaComponentProps {
  tempoRespostasegundos: number | null | undefined;
  tempoRespostaCalculadoEm?: string | null;
  mostrarDetalhes?: boolean;
  slaEmHoras?: number;
}

export const TempoRespostaComponent = ({
  tempoRespostasegundos,
  tempoRespostaCalculadoEm,
  mostrarDetalhes = false,
  slaEmHoras = 24,
}: TempoRespostaComponentProps) => {
  const slaEmSegundos = slaEmHoras * 3600;
  const cor = getCorTempoResposta(tempoRespostasegundos);
  const slaPercent = calcularSLA(tempoRespostasegundos, slaEmSegundos);
  const tempoFormatado = formatarTempoResposta(tempoRespostasegundos);
  const tempoLongo = formatarTempoRespostaLongo(tempoRespostasegundos);

  if (!tempoRespostasegundos) {
    return (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Aguardando atendimento...</span>
      </div>
    );
  }

  const badgeVariant = {
    green: "default",
    blue: "secondary",
    yellow: "outline",
    red: "destructive",
    gray: "secondary",
  }[cor.cor] as any;

  return (
    <div className="space-y-2">
      {/* Badge com tempo formatado */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Badge variant={badgeVariant}>{cor.label}</Badge>
        <span className="text-sm font-medium">{tempoFormatado}</span>
      </div>

      {/* Detalhes expandidos */}
      {mostrarDetalhes && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-3">
            {/* Tempo longo */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tempo de Resposta</p>
              <p className="text-sm">{tempoLongo}</p>
            </div>

            {/* SLA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  SLA ({slaEmHoras}h)
                </p>
                <span className={`text-xs font-bold ${slaPercent >= 80 ? "text-green-600" : "text-red-600"}`}>
                  {slaPercent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    slaPercent >= 80
                      ? "bg-green-500"
                      : slaPercent >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, slaPercent)}%` }}
                />
              </div>
              {slaPercent < 100 && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {Math.abs(100 - slaPercent)}% acima do SLA
                </p>
              )}
            </div>

            {/* Data de cálculo */}
            {tempoRespostaCalculadoEm && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Calculado em</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tempoRespostaCalculadoEm).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export const TempoRespostaSimples = ({ tempoRespostasegundos }: { tempoRespostasegundos: number | null | undefined }) => {
  if (!tempoRespostasegundos) return <span className="text-muted-foreground">—</span>;
  return <span className="font-medium">{formatarTempoResposta(tempoRespostasegundos)}</span>;
};
