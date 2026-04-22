/**
 * Converte erros do backend em mensagens amigáveis para o usuário,
 * sem expor detalhes internos (nomes de tabelas, constraints, RLS, etc.).
 * O erro original é registrado no console para depuração.
 */
export function friendlyError(err: unknown, fallback = "Não foi possível concluir a operação. Tente novamente."): string {
  // Sempre logar o erro original para depuração interna
  console.error("[error]", err);

  const raw = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();

  if (!raw) return fallback;

  // Mapeamento de padrões conhecidos -> mensagens genéricas
  if (raw.includes("duplicate key") || raw.includes("unique constraint")) {
    return "Já existe um registro com esse valor.";
  }
  if (raw.includes("row-level security") || raw.includes("rls") || raw.includes("permission denied")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (raw.includes("foreign key") || raw.includes("violates")) {
    return "Operação inválida: existem dados relacionados.";
  }
  if (raw.includes("network") || raw.includes("fetch") || raw.includes("failed to")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
    return "Email ou senha incorretos.";
  }
  if (raw.includes("email") && raw.includes("already")) {
    return "Este email já está cadastrado.";
  }
  if (raw.includes("password") && raw.includes("weak")) {
    return "Senha muito fraca. Use ao menos 6 caracteres.";
  }

  return fallback;
}

// Validação de upload de arquivos
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "text/plain",
  "text/csv",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `${file.name}: arquivo excede 10 MB.`;
  }
  if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
    return `${file.name}: tipo de arquivo não permitido.`;
  }
  return null;
}

// Sanitiza nome do arquivo para uso em path de storage
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}
