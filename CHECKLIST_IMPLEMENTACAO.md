# ✅ Checklist de Implementação - Sistema de Notificações por E-mail

## 📋 Pré-requisitos

- [ ] Conta Supabase criada e projeto inicializado
- [ ] Conta Resend criada (https://resend.com)
- [ ] Projeto Node.js com Supabase CLI instalado
- [ ] React Router configurado no projeto
- [ ] UI Components (shadcn/ui) instalados

## 🔧 Configuração Inicial

### Passo 1: Variáveis de Ambiente
- [ ] Copiar `.env.example` para `.env.local`
- [ ] Adicionar `RESEND_API_KEY` do Resend
- [ ] Adicionar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- [ ] Testar conexão com Supabase

### Passo 2: Setup Resend
- [ ] Criar conta em https://resend.com
- [ ] Obter API Key
- [ ] Verificar domínio (usar domínio padrão ou adicionar custom)
- [ ] Testar envio de e-mail via API Resend (curl ou Postman)

### Passo 3: Database Setup
- [ ] Executar migration: `supabase migration up`
- [ ] Verificar se tabela `demanda_email_log` foi criada
- [ ] Verificar se trigger foi criado
- [ ] Testar RLS policies

## 🚀 Deployment da Edge Function

### Passo 1: Preparar Função
- [ ] Editar `/supabase/functions/send-demand-email/index.ts`
- [ ] Verificar imports e dependências
- [ ] Testar sintaxe TypeScript

### Passo 2: Deploy
- [ ] Executar: `supabase functions deploy send-demand-email`
- [ ] Verificar se não houve erros no deploy
- [ ] Conferir URL da função: `{SUPABASE_URL}/functions/v1/send-demand-email`

### Passo 3: Configurar Variáveis
- [ ] Definir `RESEND_API_KEY` na edge function (via Supabase Dashboard)
- [ ] Testar chamada da função manualmente

## 📁 Arquivos Criados/Copiados

Frontend:
- [ ] `/src/lib/email-notifications.ts` - Utilitários
- [ ] `/src/components/EmailHistoryComponent.tsx` - Componente de histórico
- [ ] `/src/pages/AdminEmailNotifications.tsx` - Página admin

Backend:
- [ ] `/supabase/migrations/20260428_email_notifications.sql` - Migration
- [ ] `/supabase/functions/send-demand-email/index.ts` - Edge function
- [ ] `/supabase/functions/send-demand-email/deno.json` - Config

Documentação:
- [ ] `/EMAIL_NOTIFICATIONS_README.md` - Documentação completa
- [ ] `/EXEMPLO_INTEGRACAO_EMAIL.tsx` - Exemplos de uso

## 🧪 Testes Unitários

### Teste 1: Envio Básico
- [ ] Criar uma nova demanda
- [ ] Alterar status para "em_execucao"
- [ ] Verificar se e-mail foi recebido
- [ ] Confirmar conteúdo está correto

### Teste 2: Prevenir Duplicatas
- [ ] Alterar status da mesma demanda novamente para "em_execucao"
- [ ] Confirmar que e-mail NÃO foi enviado novamente
- [ ] Verificar log da demanda no admin

### Teste 3: Tratamento de Erros
- [ ] Remover/desabilitar API key do Resend
- [ ] Tentar alterar status
- [ ] Verificar erro registrado no log
- [ ] Restaurar API key
- [ ] Retentar envio e confirmar sucesso

### Teste 4: Todos os Status
- [ ] Testar "Em Andamento" - [ ] e-mail recebido
- [ ] Testar "Concluída" - [ ] e-mail recebido
- [ ] Testar "Cancelada" - [ ] e-mail recebido
- [ ] Testar "Impedida" - [ ] e-mail recebido
- [ ] Testar "Aberto" - [ ] NÃO deve enviar (apenas 4 status acima)

### Teste 5: Dashboard Admin
- [ ] Acessar `/admin/email-notifications`
- [ ] Verificar estatísticas corretas
- [ ] Testar envio manual de e-mail
- [ ] Testar filtros
- [ ] Testar retentar envio falhado

## 🔐 Segurança

- [ ] Verificar se API keys não estão em logs
- [ ] Validar se apenas admins podem acessar página admin
- [ ] Confirmar RLS policies estão ativas
- [ ] Testar permissões de acesso ao histórico de e-mails
- [ ] Verificar se dados sensíveis não são expostos

## 📊 Monitoramento

### Logs
- [ ] Configurar alertas no Supabase para erros
- [ ] Revisar logs de edge function
- [ ] Verificar console do navegador para erros

### Métricas
- [ ] Taxa de sucesso de envio
- [ ] Tempo médio de envio
- [ ] Quantidade de e-mails por status
- [ ] Taxa de retentativas bem-sucedidas

## 📱 Integração com Páginas

### AdminDemandas
- [ ] Importar `useDemandaWithEmailNotification`
- [ ] Conectar ao componente de status selector
- [ ] Testar alteração de status com notificação

### DemandaDetalhe
- [ ] Adicionar `EmailHistoryComponent`
- [ ] Exibir histórico de e-mails enviados
- [ ] Botão para retentar se houver falha

### AdminDashboard (opcional)
- [ ] Adicionar widget com estatísticas de e-mails
- [ ] Mostrar e-mails recentes
- [ ] Link para página completa de admin

## 🎨 UI/UX

- [ ] Componentes carregam corretamente
- [ ] Spinner/loading states funcionam
- [ ] Toasts mostram mensagens apropriadas
- [ ] Modal de detalhes exibe e-mail corretamente
- [ ] Responsivo em mobile

## 📚 Documentação

- [ ] README.md atualizado com instruções de setup
- [ ] Exemplos de código funcionando
- [ ] Comentários no código explicando fluxo
- [ ] Troubleshooting documentado

## 🚀 Deploy em Produção

### Pré-Deploy
- [ ] Todos os testes passando
- [ ] Sem erros de console
- [ ] API keys configuradas em produção
- [ ] Resend domain verificado

### Deploy
- [ ] Build do projeto sem erros: `npm run build`
- [ ] Deploy da edge function: `supabase functions deploy send-demand-email --prod`
- [ ] Deploy do frontend em seu servidor/Vercel
- [ ] Testar uma demanda em produção

### Pós-Deploy
- [ ] Monitorar logs nos primeiros dias
- [ ] Verificar taxa de sucesso
- [ ] Confirmar e-mails sendo recebidos
- [ ] Estar atento a alertas

## 🔄 Manutenção Contínua

- [ ] [ ] Revisar logs de erro mensalmente
- [ ] [ ] Atualizar templates de e-mail conforme necessário
- [ ] [ ] Monitorar quota do Resend
- [ ] [ ] Avaliar taxa de bounce de e-mails
- [ ] [ ] Testar envio mensal para garantir funcionamento

## 📞 Troubleshooting Rápido

### E-mail não está sendo enviado
- [ ] Verificar se API key está configurada
- [ ] Confirmar status da demanda foi alterado
- [ ] Checar logs em `/admin/email-notifications`
- [ ] Retentar manualmente

### Erro 500 na edge function
- [ ] Verificar variáveis de ambiente
- [ ] Conferir se função foi deployada corretamente
- [ ] Testar chamada diretamente via curl

### Duplicate emails
- [ ] Limpar cache do navegador
- [ ] Verificar se trigger está único
- [ ] Confirmar migrations foram executadas corretamente

### RLS policies não funcionando
- [ ] Re-executar migrations
- [ ] Verificar JWT token está válido
- [ ] Confirmar user_id está correto

## ✨ Extras Opcionais

- [ ] Implementar fila de e-mails (Bull Queue / Redis)
- [ ] Adicionar templates customizáveis por admin
- [ ] Implementar teste A/B de assuntos
- [ ] Adicionar tracking de abertura de e-mail
- [ ] Implementar preferências de notificação do usuário
- [ ] Integração com SendGrid ou Mailgun como fallback

## 📝 Notas

```
Data de implementação: ______________
Versão do Supabase: ______________
Versão do React: ______________
API Resend atualizada em: ______________

Observações gerais:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## ✅ CHECKLIST FINAL

Antes de considerar a implementação como completa, confirme:

- [ ] ✅ Todos os arquivos criados
- [ ] ✅ Migrations executadas
- [ ] ✅ Edge function deployada
- [ ] ✅ Testes manuais passando
- [ ] ✅ Dashboard admin funcional
- [ ] ✅ Documentação atualizada
- [ ] ✅ Código revisado
- [ ] ✅ Segurança validada
- [ ] ✅ Pronto para produção

**Data de conclusão: _______________**
**Responsável: _______________**
