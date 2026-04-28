/**
 * Utilitários para calcular e formatar tempo de resposta
 */

/**
 * Formata segundos em formato legível
 * Ex: 3661 segundos → "1h 1m 1s"
 */
export const formatarTempoResposta = (segundos: number | null | undefined): string => {
  if (!segundos || segundos < 0) return "Não calculado";

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;

  const partes: string[] = [];

  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0) partes.push(`${minutos}m`);
  if (segs > 0 || partes.length === 0) partes.push(`${segs}s`);

  return partes.join(" ");
};

/**
 * Formata segundos em formato mais longo
 * Ex: 3661 → "1 hora, 1 minuto e 1 segundo"
 */
export const formatarTempoRespostaLongo = (segundos: number | null | undefined): string => {
  if (!segundos || segundos < 0) return "Não calculado";

  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;

  const partes: string[] = [];

  if (dias > 0) {
    partes.push(`${dias} dia${dias > 1 ? "s" : ""}`);
  }
  if (horas > 0) {
    partes.push(`${horas} hora${horas > 1 ? "s" : ""}`);
  }
  if (minutos > 0) {
    partes.push(`${minutos} minuto${minutos > 1 ? "s" : ""}`);
  }
  if (segs > 0 || partes.length === 0) {
    partes.push(`${segs} segundo${segs !== 1 ? "s" : ""}`);
  }

  if (partes.length === 1) return partes[0];
  if (partes.length === 2) return partes.join(" e ");

  return partes.slice(0, -1).join(", ") + " e " + partes[partes.length - 1];
};

/**
 * Calcula categoria de tempo de resposta
 */
export const categorizarTempoResposta = (
  segundos: number | null | undefined
): "rapido" | "normal" | "lento" | "muito_lento" | "nao_calculado" => {
  if (!segundos) return "nao_calculado";

  const minutos = segundos / 60;
  const horas = minutos / 60;
  const dias = horas / 24;

  if (dias >= 7) return "muito_lento";      // 7+ dias
  if (dias >= 1) return "lento";            // 1+ dias
  if (horas >= 4) return "normal";          // 4+ horas
  return "rapido";                          // < 4 horas
};

/**
 * Retorna cor/badge para o tempo de resposta
 */
export const getCorTempoResposta = (
  segundos: number | null | undefined
): { cor: string; label: string } => {
  const categoria = categorizarTempoResposta(segundos);

  const cores = {
    rapido: { cor: "green", label: "Rápido" },
    normal: { cor: "blue", label: "Normal" },
    lento: { cor: "yellow", label: "Lento" },
    muito_lento: { cor: "red", label: "Muito Lento" },
    nao_calculado: { cor: "gray", label: "Não calculado" },
  };

  return cores[categoria];
};

/**
 * Calcula métrica de SLA
 * retorna % de conformidade com alvo (ex: 24h de SLA)
 */
export const calcularSLA = (
  tempoRespostasegundos: number | null | undefined,
  slaEmSegundos: number = 86400 // 24 horas por padrão
): number => {
  if (!tempoRespostasegundos) return 0;
  
  const conformidade = Math.min(100, Math.max(0, (slaEmSegundos - tempoRespostasegundos) / slaEmSegundos * 100));
  return Math.round(conformidade);
};
