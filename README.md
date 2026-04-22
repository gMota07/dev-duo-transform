# FS Consultores – Sistema de Demandas

Uma aplicação completa para gerenciamento de demandas internas, com suporte a solicitação de serviços, acompanhamento de status, anexos de arquivos, notificações por e-mail e painel administrativo.

## Visão Geral

Este sistema permite que colaboradores abram demandas (tickets) para a equipe FS Consultores, acompanhem o andamento, recebam respostas e notificações. Administradores podem gerenciar usuários, categorias, atribuir responsáveis e responder demandas com anexos.

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + shadcn/ui |
| Estado & Cache | TanStack Query |
| Backend | Lovable Cloud (Supabase) |
| Banco de Dados | PostgreSQL |
| Auth | Email/Senha + Google OAuth |
| Armazenamento | Supabase Storage |
| E-mail | Resend (notificações) |
| Edge Functions | Deno / Supabase Edge Functions |

## Estrutura do Projeto

```
src/
├── components/
│   ├── ui/                # Componentes shadcn/ui reutilizáveis
│   ├── AppLayout.tsx      # Layout com navegação lateral
│   ├── NavLink.tsx        # Link de navegação ativo
│   ├── ProtectedRoute.tsx # Guarda de rotas por papel
│   └── StatusBadge.tsx    # Badge colorido de status
├── hooks/
│   ├── useAuth.tsx        # Contexto de autenticação
│   ├── use-toast.ts       # Hook de toast notifications
│   └── use-mobile.tsx     # Hook de viewport mobile
├── integrations/
│   └── supabase/
│       ├── client.ts      # Cliente Supabase (auto-gerado)
│       └── types.ts       # Tipos do banco (auto-gerado)
├── lib/
│   └── utils.ts           # Utilitários (cn, helpers)
├── pages/
│   ├── Login.tsx          # Tela de login
│   ├── Index.tsx          # Página inicial
│   ├── NovaDemanda.tsx    # Criar nova demanda
│   ├── MinhasDemandas.tsx # Listar demandas do usuário
│   ├── DemandaDetalhe.tsx # Detalhe de uma demanda
│   ├── AdminDashboard.tsx # Painel administrativo
│   ├── AdminUsuarios.tsx  # Gerenciar usuários
│   ├── AdminCategorias.tsx# Gerenciar categorias
│   └── NotFound.tsx       # Página 404
└── test/                  # Testes (Vitest)

supabase/
├── functions/
│   ├── bootstrap-admin/   # Cria admin inicial (one-shot)
│   ├── admin-create-user/ # Cria usuário via admin
│   └── notify-demanda/    # Envia e-mails de notificação
├── migrations/            # Migrações do banco
└── config.toml            # Configuração do projeto Supabase
```

## Pré-requisitos

- **Node.js** >= 18
- **npm** ou **bun**
- Conta no **Lovable Cloud** (backend gerenciado)
- Chave da API do **Resend** (para e-mails — opcional)

## Instalação Local

1. Clone o repositório:
   ```bash
   git clone <url-do-repo>
   cd <pasta-do-projeto>
   ```

2. Instale as dependências:
   ```bash
   npm install
   # ou
   bun install
   ```

3. Configure as variáveis de ambiente no arquivo `.env`:
   ```
   VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<sua-anon-key>
   VITE_SUPABASE_PROJECT_ID=<seu-project-id>
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   # ou
   bun dev
   ```

5. Abra no navegador: `http://localhost:8080`

## Build para Produção

```bash
npm run build
# ou
bun run build
```

Os artefatos serão gerados na pasta `dist/`.

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave anônima (pública) do Supabase |
| `VITE_SUPABASE_PROJECT_ID` | Sim | ID do projeto Supabase |

> As variáveis de build são configuradas automaticamente pelo Lovable Cloud. Não é necessário editar `.env` manualmente ao trabalhar no Lovable.

## Funcionalidades

### Usuário comum
- Cadastro e login (e-mail/senha ou Google)
- Criar demandas com título, descrição, categoria, urgência e anexos
- Acompanhar status e histórico de alterações
- Receber notificações por e-mail quando o status mudar ou houver resposta
- Visualizar todas as demandas abertas pelo próprio usuário

### Administrador
- Dashboard com estatísticas e gráficos (Recharts)
- Listar **todas** as demandas do sistema
- Atribuir responsável, alterar status e responder com texto
- Gerenciar usuários (criar, listar, alterar papel)
- Gerenciar categorias e subcategorias
- Receber notificações automáticas de novas demandas

## Credenciais Iniciais

Após a primeira execução do **Edge Function `bootstrap-admin`**, o sistema possui um administrador padrão:

- **E-mail:** `admin@fsconsultores.com.br`
- **Senha:** `admin123`

> Essa função pode ser chamada uma única vez. Após o primeiro admin criado, ela se desativa automaticamente.

## Arquitetura de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Dados dos usuários (id, nome, e-mail) |
| `user_roles` | Papéis (`admin` / `usuario`) |
| `demandas` | Registro de cada demanda/ticket |
| `demanda_historico` | Log de mudanças de status e ações |
| `demanda_anexos` | Metadados dos arquivos anexados |
| `categorias` | Categorias de demandas |
| `subcategorias` | Subcategorias vinculadas às categorias |

### Relacionamentos
- `demandas.solicitante_id` → `profiles.id`
- `demandas.responsavel_id` → `profiles.id`
- `demandas.categoria_id` → `categorias.id`
- `demandas.subcategoria_id` → `subcategorias.id`

## Autenticação & Autorização

- **JWT** gerenciado pelo Supabase Auth
- **Row Level Security (RLS)** habilitado em todas as tabelas protegidas
- Usuários comuns veem apenas suas próprias demandas
- Administradores acessam todos os dados via `has_role()` (Security Definer)
- O papel do usuário é armazenado na tabela `user_roles`, separado do `profiles`

## Edge Functions

| Função | Descrição | Visibilidade |
|--------|-----------|--------------|
| `bootstrap-admin` | Cria o primeiro admin do sistema | Pública (one-shot) |
| `admin-create-user` | Cria novos usuários via painel admin | Pública (validação interna) |
| `notify-demanda` | Envia e-mails de notificação via Resend | Pública (validação interna) |

> Para deploy local das Edge Functions, consulte a documentação do Supabase CLI.

## Notificações por E-mail

O sistema utiliza **Resend** para enviar e-mails transacionais. Os eventos que disparam notificação são:

- **Status alterado** pelo admin → e-mail para o solicitante
- **Resposta do admin** → e-mail para o solicitante
- **Nova demanda** → e-mail para o admin (em breve)

Configure a chave `RESEND_API_KEY` nos **Secrets** do projeto para ativar.

## Design System

- **Cores principais:** roxo (`#6d28d9`), azul (`#3b5bdb`) e branco
- **Tipografia:** Inter (corpo) + SF Pro Display (títulos, opcional)
- **Componentes:** shadcn/ui com variantes customizadas
- **Ícones:** Lucide React

## Scripts Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run test` | Executar testes com Vitest |
| `npm run lint` | Executar ESLint |

## Deploy

Este projeto é otimizado para deploy no **Lovable Cloud / Vercel**:

1. O build é gerado automaticamente pelo Lovable
2. As variáveis de ambiente são injetadas pelo Lovable Cloud
3. O banco de dados e Edge Functions são gerenciados pelo Supabase

Se desejar deploy em outro provedor (Vercel, Netlify, etc.), configure as variáveis de ambiente manualmente e aponte `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` para o projeto Supabase correto.

## Licença

Este projeto é desenvolvido sob encomenda para **FS Consultores**. Todos os direitos reservados.

---

**Dúvidas ou suporte?** Entre em contato com a equipe de desenvolvimento.
