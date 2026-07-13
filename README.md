# 🎤 KaraoKê Queue

Sistema full-stack de gerenciamento de fila para noites de karaokê. Participantes se registram com CPF, pesquisam músicas no YouTube e reservam sua vaga na fila. Operadores controlam a sessão, gerenciam o andamento e acompanham estatísticas em tempo real.

![Preview](attached_assets/image_1781198981272.png)

---

## Funcionalidades

### Participante (página `/`)
- Registro por CPF com validação completa de dígitos verificadores
- Busca de músicas via YouTube Data API v3 (com fallback de demo se a chave não estiver configurada)
- Pré-visualização de vídeos antes de reservar
- Reserva de vaga na fila da sessão ativa
- Acompanhamento de posição e estimativa de espera em tempo real (atualização a cada 3 s)
- Extrato pessoal com histórico de reservas da sessão
- Cancelamento de reserva pendente diretamente pelo extrato
- Indicação visual da própria entrada na fila pública ("← você")

### Operador (página `/operator`)
- Login protegido por senha (padrão: `admin` / `admin123`)
- Criação, pausa e encerramento de sessões
- Estatísticas ao vivo (total de reservas, músicas cantadas, participantes únicos)
- Controle da fila: finalizar, pular ou remover entradas individualmente
- Página geração de QR Code (página `/qr`) para facilitar o acesso dos participantes

### Player (página `/player`)
- Player YouTube fullscreen com controles fade-out
- Countdown de 5 segundos entre músicas
- Auto-skip em caso de erro de incorporação
- Exibição do nome do próximo participante

---

## Tecnologias

| Categoria | Tecnologia | Finalidade |
|---|---|---|
| **Linguagem** | TypeScript 5.9 | Tipagem estática em toda a stack |
| **Runtime** | Node.js 24 | Execução do servidor e ferramentas |
| **Frontend** | React 19 + Vite 7 | UI reativa e build rápido |
| **Estilo** | Tailwind CSS v4 | Utilitários de CSS |
| **Componentes** | shadcn/ui + Radix UI | Componentes acessíveis |
| **Roteamento** | Wouter | Roteamento leve no cliente |
| **Estado/fetching** | TanStack React Query | Cache e sincronização de dados |
| **Backend** | Express 5 | API REST |
| **Banco de dados** | PostgreSQL 16 | Persistência relacional |
| **ORM** | Drizzle ORM | Queries tipadas e migrações |
| **Validação** | Zod v4 + drizzle-zod | Schemas compartilhados front/back |
| **Codegen** | Orval | Geração de hooks React Query e schemas Zod a partir do OpenAPI |
| **Build (API)** | esbuild | Bundle CJS rápido para produção |
| **Hash de senha** | Node.js `crypto` (PBKDF2) | Hash seguro sem dependências nativas |
| **Logging** | Pino + pino-http | Logs estruturados em JSON |
| **Pacotes** | pnpm 10 (workspaces) | Monorepo com dependências eficientes |
| **API externa** | YouTube Data API v3 | Busca de vídeos |

---

## Arquitetura

O projeto segue uma arquitetura de **monorepo pnpm** com separação clara entre apps implantáveis (`artifacts/`) e bibliotecas compartilhadas (`lib/`).

```
┌─────────────────────────────────────────────┐
│               artifacts/                    │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │  karaoke-queue   │  │   api-server    │  │
│  │  React + Vite    │  │   Express 5     │  │
│  │  (porta variável)│  │   (porta 8080)  │  │
│  └────────┬─────────┘  └────────┬────────┘  │
└───────────┼─────────────────────┼───────────┘
            │ HTTP /api           │
            ▼                     ▼
┌─────────────────────────────────────────────┐
│                  lib/                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ api-spec │  │ api-zod  │  │    db    │  │
│  │ OpenAPI  │  │ Zod gen. │  │  Drizzle │  │
│  │  YAML    │  │          │  │ + PgSQL  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│  ┌───────────────────────┐                  │
│  │  api-client-react     │                  │
│  │  React Query hooks    │                  │
│  └───────────────────────┘                  │
└─────────────────────────────────────────────┘
```

O proxy reverso do Replit (ou qualquer proxy que você configure) roteia `/api` para o servidor Express e `/` para o Vite. As rotas são prefixadas com seu `BASE_PATH`.

**Fluxo de contrato:** `openapi.yaml` → Orval gera `api-zod` (schemas Zod) e `api-client-react` (hooks React Query) → ambos os lados consomem os mesmos tipos.

---

## Estrutura de Pastas

```
karaoke-queue/
├── artifacts/
│   ├── api-server/            # Servidor Express 5 (API REST)
│   │   ├── src/
│   │   │   ├── app.ts         # Configuração do Express, middlewares globais
│   │   │   ├── index.ts       # Entry point (bind na porta)
│   │   │   ├── lib/           # Utilitários internos (auth, youtube, etc.)
│   │   │   ├── middlewares/   # Middlewares Express (ex: requireOperator)
│   │   │   └── routes/        # Handlers de rota (sessions, queue, songs, etc.)
│   │   ├── build.mjs          # Script de build esbuild
│   │   └── package.json
│   └── karaoke-queue/         # Frontend React + Vite
│       ├── src/
│       │   ├── pages/         # Páginas: Home, Operator, Player, QR
│       │   ├── components/ui/ # Componentes shadcn/ui
│       │   ├── contexts/      # Contextos React
│       │   ├── hooks/         # Hooks customizados
│       │   └── lib/           # Utilitários (cn, cpf, etc.)
│       ├── public/            # Arquivos estáticos (favicon, og image)
│       ├── index.html
│       └── vite.config.ts
├── lib/
│   ├── api-spec/              # Fonte da verdade do contrato
│   │   ├── openapi.yaml       # Especificação OpenAPI 3.1
│   │   └── orval.config.ts    # Configuração do gerador Orval
│   ├── api-zod/               # Schemas Zod gerados (não editar manualmente)
│   │   └── src/generated/
│   ├── api-client-react/      # Hooks React Query gerados (não editar manualmente)
│   │   └── src/generated/
│   └── db/                    # Schema e configuração Drizzle ORM
│       ├── src/schema/        # Definição das tabelas
│       └── drizzle.config.ts
├── scripts/                   # Scripts utilitários do workspace
├── package.json               # Root: scripts de build/typecheck, devDeps globais
├── pnpm-workspace.yaml        # Configuração do monorepo e catálogo de versões
├── tsconfig.json              # Solution file para libs compostas
├── tsconfig.base.json         # Configuração TypeScript compartilhada
└── pnpm-lock.yaml             # Lockfile (commitar sempre)
```

---

## Requisitos

| Requisito | Versão mínima |
|---|---|
| Node.js | 20+ (recomendado: 24) |
| pnpm | 10+ |
| PostgreSQL | 14+ (recomendado: 16) |

---

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/karaoke-queue.git
cd karaoke-queue

# 2. Instale as dependências de todo o monorepo
pnpm install
```

> **Atenção:** não use `npm install` ou `yarn`. O projeto usa pnpm workspaces e o lockfile é `pnpm-lock.yaml`.

---

## Configuração

### 1. Variáveis de ambiente

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

Edite `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/karaoke_queue
SESSION_SECRET=sua-chave-secreta-aqui
YOUTUBE_API_KEY=sua-chave-youtube-aqui   # opcional
```

### 2. Banco de dados

Crie o banco no PostgreSQL:

```sql
CREATE DATABASE karaoke_queue;
```

Em seguida, aplique o schema Drizzle:

```bash
pnpm --filter @workspace/db run push
```

### 3. Seed (operador padrão)

O servidor cria automaticamente o operador padrão na primeira inicialização:
- **Usuário:** `admin`
- **Senha:** `admin123`

> Troque a senha pelo painel do operador ou diretamente no banco em produção.

---

## Como Executar

### Desenvolvimento

Execute os dois serviços em terminais separados (ou use um process manager):

```bash
# Terminal 1 — API Server
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
pnpm --filter @workspace/karaoke-queue run dev
```

Acesse `http://localhost:<PORT>` (a porta é atribuída pela variável de ambiente `PORT`).

### Produção

```bash
# Build completo (typecheck + bundle)
pnpm run build

# Iniciar o servidor da API
pnpm --filter @workspace/api-server run start
```

O frontend é servido como arquivos estáticos após o build (`artifacts/karaoke-queue/dist/`). Configure seu servidor web (nginx, Caddy, etc.) para servir esses arquivos e fazer proxy de `/api` para a porta da API.

---

## Scripts Disponíveis

| Script | Comando | Descrição |
|---|---|---|
| Build completo | `pnpm run build` | Typecheck + build de todos os pacotes |
| Typecheck libs | `pnpm run typecheck:libs` | Compila as libs compostas |
| Typecheck total | `pnpm run typecheck` | Typecheck de toda a workspace |
| Codegen API | `pnpm --filter @workspace/api-spec run codegen` | Regenera hooks e schemas a partir do OpenAPI |
| Push DB | `pnpm --filter @workspace/db run push` | Aplica o schema Drizzle ao banco (dev) |
| Dev API | `pnpm --filter @workspace/api-server run dev` | Inicia o servidor em modo desenvolvimento |
| Dev Frontend | `pnpm --filter @workspace/karaoke-queue run dev` | Inicia o Vite em modo desenvolvimento |

---

## Banco de Dados

### Tabelas

| Tabela | Descrição |
|---|---|
| `operators` | Operadores do sistema (login/senha) |
| `participants` | Participantes registrados (CPF + nome) |
| `sessions` | Sessões de karaokê (OPEN / PAUSED / CLOSED) |
| `songs` | Cache de músicas pesquisadas no YouTube |
| `reservations` | Reservas de músicas por participantes (QUEUED / PLAYING / FINISHED / SKIPPED / REMOVED / CANCELLED) |
| `queue_entries` | Entradas na fila com posição ordenada |

### Migrações

Este projeto usa o modo **push** do Drizzle em desenvolvimento (sem arquivos de migração SQL). Para produção, considere gerar migrações:

```bash
# Gerar arquivos de migração SQL (recomendado para produção)
pnpm --filter @workspace/db run generate

# Aplicar migrações (modo push — apenas dev)
pnpm --filter @workspace/db run push
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ Sim | String de conexão PostgreSQL completa |
| `SESSION_SECRET` | ✅ Sim | Chave secreta para assinar cookies de sessão do operador |
| `YOUTUBE_API_KEY` | ❌ Opcional | Chave da YouTube Data API v3. Se omitida, retorna um resultado de demo |
| `PORT` | ❌ Opcional | Porta de escuta da API (padrão: 8080) |
| `NODE_ENV` | ❌ Opcional | `development` ou `production` |

---

## Build

```bash
# Build de produção completo
pnpm run build
```

O build:
1. Executa `tsc --build` em todos os pacotes `lib/`
2. Executa `tsc --noEmit` nos `artifacts/` (typecheck)
3. Faz o bundle do servidor Express com esbuild → `artifacts/api-server/dist/`
4. Faz o bundle do frontend com Vite → `artifacts/karaoke-queue/dist/`

---

## Deploy

### Replit (recomendado para prototipagem rápida)
O projeto já está configurado para Replit. Clique em **Deploy** no painel do Replit.

### VPS / Cloud genérico

1. Configure as variáveis de ambiente no servidor
2. Execute `pnpm install --frozen-lockfile`
3. Execute `pnpm --filter @workspace/db run push`
4. Execute `pnpm run build`
5. Inicie o servidor: `pnpm --filter @workspace/api-server run start`
6. Sirva `artifacts/karaoke-queue/dist/` com nginx/Caddy e faça proxy de `/api` → porta da API

### Docker

Um `Dockerfile` ainda não está incluso. Contribuições são bem-vindas!

---

## Capturas de Tela

> Adicione capturas de tela das páginas principais na pasta `docs/screenshots/`:
> - `home.png` — Tela do participante
> - `operator.png` — Painel do operador
> - `player.png` — Player fullscreen
> - `qr.png` — Página de QR Code

---

## Roadmap

- [ ] Autenticação de participante por senha ou PIN
- [ ] Múltiplos operadores com permissões diferentes
- [ ] Histórico persistente entre sessões por CPF
- [ ] Modo offline com fallback local
- [ ] Notificações push quando a vez se aproximar
- [ ] Exportação de relatório da noite (PDF/CSV)
- [ ] Tema claro / escuro configurável pelo operador
- [ ] Docker Compose para setup local simplificado
- [ ] Testes automatizados (Vitest + Playwright)

---

## Contribuição

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faça suas alterações e commite: `git commit -m 'feat: minha feature'`
4. Se alterar `openapi.yaml`, regenere o código: `pnpm --filter @workspace/api-spec run codegen`
5. Se alterar o schema do banco, aplique: `pnpm --filter @workspace/db run push`
6. Rode o typecheck: `pnpm run typecheck`
7. Abra um Pull Request

---

## Licença

MIT — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## Autor

Feito com ♥ para animar noites de karaokê.

> Substitua esta seção com seu nome, GitHub e contatos.
