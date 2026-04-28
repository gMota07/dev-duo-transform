# 📧 Sistema de Notificações por E-mail - Dev Duo Transform

## Visão Geral

Sistema automático e robusto de envio de e-mails para notificar solicitantes sobre alterações no status de suas demandas no sistema de gerenciamento de demandas.

## 🎯 Funcionalidades

### ✅ Automação de E-mails
- **Envio Automático**: Dispara automaticamente quando o status de uma demanda é alterado
- **Múltiplos Status**: Suporta notificações para "Em Andamento", "Concluída", "Cancelada" e "Impedida"
- **Templates Dinâmicos**: Conteúdo personalizável com dados da demanda

### 🛡️ Prevenção de Erros
- **Evitar Duplicatas**: Registra todos os envios para evitar notificações duplicadas
- **Log de Erros**: Armazena erros de envio para análise e retentativas
- **Tratamento de Falhas**: Pode retentar envios que falharam

### 📊 Monitoramento
- **Histórico Completo**: Visualizar todos os e-mails enviados
- **Dashboard Admin**: Página dedicada para gerenciar notificações
- **Estatísticas**: Taxa de sucesso e falhas

## 🏗️ Arquitetura

### Componentes

```
┌─────────────────────────────────────────────┐
│         Frontend (React)                     │
│  - Componentes & Hooks                      │
│  - Utilitários (email-notifications.ts)     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Banco de Dados (Supabase)              │
│  - Tabela: demanda_email_log                │
│  - Trigger: trigger_demanda_status_change   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│    Edge Function (Supabase)                 │
│  - send-demand-email                        │
│  - Gera templates                           │
│  - Integração com Resend/SendGrid           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│    Provedor de E-mail (Resend/SendGrid)    │
└─────────────────────────────────────────────┘
```

## 📁 Arquivos Criados/Modificados

### Backend (Supabase)

#### 1. **Migration: `20260428_email_notifications.sql`**
   - Cria tabela `demanda_email_log` para rastreamento
   - Define trigger `trigger_demanda_status_change`
   - Automatiza registro de mudanças de status

#### 2. **Edge Function: `send-demand-email/index.ts`**
   - Lógica principal de envio
   - Templates HTML de e-mail
   - Integração com Resend API
   - Tratamento de erros

### Frontend (React)

#### 1. **Utilitários: `src/lib/email-notifications.ts`**
   ```typescript
   - sendDemandaEmailNotification()      // Enviar manualmente
   - getDemandaEmailHistory()            // Obter histórico
   - retryFailedEmailNotification()      // Retentar falhas
   - checkEmailAlreadySent()             // Evitar duplicatas
   ```

#### 2. **Componente: `src/components/EmailHistoryComponent.tsx`**
   - Visualizar histórico de e-mails
   - Retentar envios falhados
   - Modal com detalhes do e-mail

#### 3. **Página Admin: `src/pages/AdminEmailNotifications.tsx`**
   - Dashboard de gerenciamento
   - Estatísticas de envios
   - Envio de e-mails de teste
   - Filtros e busca

## 🚀 Configuração

### 1. Variáveis de Ambiente

Adicione ao seu arquivo `.env.local`:

```bash
# Supabase
VITE_SUPABASE_URL=https://aalploxfrbkmirnczjlb.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui

# Resend (para envio de e-mails)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

### 2. Setup no Supabase

#### Passo 1: Executar a Migration
```bash
npx supabase migration up
```

#### Passo 2: Configurar Edge Function
```bash
# Deploy da função
supabase functions deploy send-demand-email

# Ou para desenvolvimento local
supabase start
supabase functions serve
```

#### Passo 3: Criar Conta Resend
1. Acesse [resend.com](https://resend.com)
2. Crie uma conta e obtenha sua API key
3. Configure o domínio (ex: noreply@fs-consultores.com.br)

### 3. RLS Policies

A tabela `demanda_email_log` precisa de policies para acesso:

```sql
-- Permitir leitura do próprio histórico de e-mails
CREATE POLICY "users_can_read_own_email_history" ON demanda_email_log
  FOR SELECT
  USING (
    demanda_id IN (
      SELECT id FROM demandas 
      WHERE solicitante_id = auth.uid()
    )
  );

-- Permitir admins ler todos
CREATE POLICY "admins_can_read_all_email_logs" ON demanda_email_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
```

## 💬 Modelos de E-mail

### 1. Status: "Em Andamento"

**Assunto:** Sua demanda está em andamento - "[Título]"

```
Olá, [Nome]!

Sua demanda "[Título]" foi iniciada e já está em tratamento.

Status: Em andamento
Data da atualização: [Data Formatada]

Você poderá acompanhar o andamento pelo sistema.
```

### 2. Status: "Concluída"

**Assunto:** Sua demanda foi concluída - "[Título]"

```
Olá, [Nome]!

Sua demanda "[Título]" foi finalizada com sucesso!

Status: Concluída ✓
Data da conclusão: [Data Formatada]

Caso tenha dúvidas ou necessite fazer alterações, você pode abrir uma nova demanda.
```

### 3. Status: "Cancelada"

**Assunto:** Sua demanda foi cancelada - "[Título]"

```
Olá, [Nome]!

Sua demanda "[Título]" foi cancelada.

Status: Cancelada
Data da atualização: [Data Formatada]

Se você acredita que isso foi feito por engano, entre em contato conosco.
```

### 4. Status: "Impedida"

**Assunto:** Sua demanda foi impedida - "[Título]"

```
Olá, [Nome]!

Sua demanda "[Título]" foi impedida e necessita de ação.

Status: Impedida ⚠️
Data da atualização: [Data Formatada]

Por favor, verifique os detalhes no sistema.
```

## 🔄 Fluxo de Funcionamento

### 1️⃣ Alteração de Status
```
Usuário altera status no Admin → UPDATE demanda SET status = 'em_execucao'
```

### 2️⃣ Disparo do Trigger
```
Trigger detect mudança → Executa trigger_demanda_status_change()
```

### 3️⃣ Chamada da Edge Function
```
Trigger chama HTTP POST → /functions/v1/send-demand-email
```

### 4️⃣ Geração e Envio de E-mail
```
Edge Function:
  1. Gera template HTML
  2. Formata dados da demanda
  3. Chama Resend API
  4. Registra no log
```

### 5️⃣ Registro no Histórico
```
Email Log registrado em demanda_email_log com status de sucesso/erro
```

## 📝 Exemplo de Uso

### Enviar E-mail de Teste (Frontend)

```typescript
import { sendDemandaEmailNotification } from '@/lib/email-notifications';

// Enviar e-mail
const success = await sendDemandaEmailNotification('demanda-id-uuid', true);
if (success) {
  console.log('E-mail enviado com sucesso!');
}
```

### Exibir Histórico de E-mails

```typescript
import { EmailHistoryComponent } from '@/components/EmailHistoryComponent';

<EmailHistoryComponent demandaId="demanda-id-uuid" />
```

### Acessar Dashboard Admin

Navegue para: `/admin/email-notifications`

## 🧪 Teste da Funcionalidade

### Teste Manual

1. **Criar uma demanda** no sistema
2. **Ir para Admin**
3. **Alterar status** da demanda para "Em Andamento"
4. **Verificar e-mail** na caixa de entrada
5. **Visualizar histórico** em `/admin/email-notifications`

### Teste via Dashboard

1. Acesse `/admin/email-notifications`
2. Na seção "Enviar E-mail de Teste", cole o ID de uma demanda
3. Clique em "Enviar Teste"
4. Verifique se o e-mail foi enviado (tabela de histórico)

## ⚠️ Tratamento de Erros

### Cenários Tratados

1. **API Key não configurada**
   - Erro registrado no log
   - Exibido para o admin
   - Pode ser retentado após configuração

2. **E-mail inválido**
   - Erro registrado
   - Admin notificado
   - Pode ser retentado manualmente

3. **Demanda não encontrada**
   - Validação no frontend
   - Erro mostrado ao usuário

4. **Timeout**
   - Registrado e pode ser retentado
   - Log mantém tentativas

### Como Retentar

1. Acesse `/admin/email-notifications`
2. Encontre o e-mail falhado (badge "Falha")
3. Clique no botão "Retentar"
4. Resolva o problema (ex: configurar API key)
5. Clique novamente em "Retentar"

## 🔐 Segurança

### Validações

- ✅ Usuário autenticado para enviar e-mails
- ✅ Permissão verificada para visualizar logs
- ✅ Rate limiting implícito (1 e-mail por status por demanda)
- ✅ Dados sensíveis não expostos em logs públicos

### Boas Práticas

- 🔒 API keys armazenadas em variáveis de ambiente
- 🔒 Sem informações sensíveis em logs
- 🔒 Validação de e-mail do destinatário
- 🔒 Timestamp de todas as operações

## 📊 Monitoramento

### O que Monitorar

1. **Taxa de Sucesso**
   - Esperado: > 95% de sucesso
   - Verificar em `/admin/email-notifications`

2. **Latência**
   - Ideal: < 5 segundos
   - Considerar aumentar timeout se > 30s

3. **Erros Comuns**
   - E-mail inválido
   - API key expirada
   - Limite de envios atingido

## 🚨 Troubleshooting

### "E-mail não recebido"
1. Verificar se API key está configurada
2. Confirmar e-mail do solicitante está correto
3. Checar pasta de SPAM
4. Visualizar log em `/admin/email-notifications`

### "Erro: RESEND_API_KEY não configurada"
1. Adicionar ao `.env.local`: `RESEND_API_KEY=re_xxx`
2. Redeploy da edge function
3. Retentar envio

### "E-mail enviado mas não está no histórico"
1. Recarregar página
2. Verificar se permissões RLS estão corretas
3. Consultar logs do Supabase

## 📚 Recursos Adicionais

- [Documentação Resend](https://resend.com/docs)
- [Documentação Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentação Supabase Triggers](https://supabase.com/docs/guides/database/tables)

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verificar os logs em `/admin/email-notifications`
2. Consultar documentação Supabase
3. Testar com e-mail de teste antes de usar em produção

---

**Última atualização:** 28 de abril de 2026
**Status:** ✅ Pronto para Produção
