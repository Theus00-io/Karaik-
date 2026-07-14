# KaraoKê Queue

Aplicação full-stack para organizar noites de karaokê. Participantes identificam-se, pesquisam músicas no YouTube, entram na fila e acompanham sua posição; operadores gerenciam a sessão e o player em tempo real.

## Destaques

- Reserva com validação de CPF e regra de uma música ativa por participante.
- Fila ao vivo, estimativa de espera, histórico e cancelamento.
- Painel autenticado para abrir, pausar e encerrar sessões.
- Player de palco com YouTube IFrame API e transição entre músicas.
- Interface responsiva com narrativa GSAP/ScrollTrigger, SVG inline e modo de movimento reduzido.
- API protegida por sessão assinada, cookies seguros, rate limiting, CSP e validação Zod.
- Blueprint completo para deploy de frontend, API e PostgreSQL na Render.

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, Radix UI, TanStack Query, Wouter |
| Movimento | GSAP 3, ScrollTrigger, SVG inline |
| Backend | Node.js, Express 5, Pino |
| Dados | PostgreSQL, Drizzle ORM |
| Contrato | OpenAPI 3.1, Orval, Zod |
| Qualidade | ESLint, TypeScript, Vitest, Prettier |
| Infraestrutura | pnpm workspaces, Render Blueprint |

## Arquitetura

```text
artifacts/
  karaoke-queue/       SPA React, páginas e componentes
  api-server/          API Express e servidor dos assets de produção
lib/
  api-spec/            fonte OpenAPI
  api-zod/             schemas gerados
  api-client-react/    hooks React Query gerados
  db/                  conexão e schemas Drizzle
scripts/               utilitários do workspace
```

Em produção há um único Web Service: o Express responde em `/api`, serve `artifacts/karaoke-queue/dist/public` e entrega `index.html` como fallback da SPA. O PostgreSQL é um recurso separado.

## Pré-requisitos

- Node.js 20, 22 ou 24 (24 recomendado)
- pnpm 10.17.1
- PostgreSQL 14+

Ative a versão declarada do gerenciador com Corepack quando disponível:

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install --frozen-lockfile
```

## Configuração local

```bash
cp .env.example .env
pnpm --filter @workspace/db run push
```

Variáveis obrigatórias:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | conexão PostgreSQL |
| `SESSION_SECRET` | assinatura HMAC da sessão; mínimo de 32 caracteres em produção |
| `ADMIN_PASSWORD` | criação do primeiro operador; mínimo de 12 caracteres |

Variáveis opcionais: `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME`, `YOUTUBE_API_KEY`, `APP_ORIGIN`, `PORT`, `LOG_LEVEL` e `BASE_PATH`. Sem `YOUTUBE_API_KEY`, a busca retorna um item de demonstração. Não há credencial padrão no código.

## Desenvolvimento

Em dois terminais:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/karaoke-queue run dev
```

O Vite usa porta `5173` e base `/` por padrão. A API exige `PORT` ao iniciar. Configure proxy reverso de `/api` para a API ao separar os processos.

## Scripts

```bash
pnpm run lint          # ESLint
pnpm run typecheck     # TypeScript em toda a workspace
pnpm run test          # Vitest
pnpm run build         # typecheck + bundles de produção
pnpm run format:check  # verificação Prettier
pnpm audit --prod      # advisories de produção
```

Para atualizar o contrato:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Segurança

- Rotas mutáveis de sessão e fila exigem operador autenticado.
- Sessão stateless assinada com HMAC-SHA256, expiração de 8 horas e cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- Senhas novas usam `scrypt`; hashes PBKDF2 legados continuam verificáveis.
- Login e API têm limitação de requisições; CORS não é aberto por padrão.
- CSP, anti-clickjacking, `nosniff`, Referrer Policy e Permissions Policy são enviados globalmente.
- O CPF não é mais exposto na resposta pública da fila.
- Erros internos são registrados sem devolver stack trace ao cliente.

Veja [AUDIT_REPORT.md](AUDIT_REPORT.md) para achados e riscos residuais.

## Build e deploy

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
pnpm run build
pnpm --filter @workspace/api-server run start
```

O arquivo [render.yaml](render.yaml) reproduz esses passos. Consulte [DEPLOY.md](DEPLOY.md) para conexão com GitHub, variáveis, domínio, logs, atualização e rollback.

## SEO e acessibilidade

O frontend inclui metadados sociais, canonical, favicon, `robots.txt`, `sitemap.xml`, landmarks semânticos, skip link, foco visível, modais identificados e suporte a `prefers-reduced-motion`. Ajuste o domínio `karaoke-queue.onrender.com` nos metadados e sitemap se o serviço receber outro nome ou domínio próprio.

## Limitações conhecidas

- O acesso do participante ainda usa o CPF como prova de posse para histórico/cancelamento; um PIN por reserva é recomendado.
- O schema é aplicado por `drizzle-kit push`; migrações SQL versionadas são recomendadas antes de operações de maior escala.
- Polling a cada 3 segundos é adequado ao porte atual; WebSocket/SSE pode reduzir carga em eventos grandes.
- Não foi incluído teste E2E com banco/YouTube reais; os testes atuais cobrem CPF, sessão assinada e health check HTTP.
- O canonical/sitemap usam o hostname padrão do Blueprint e devem acompanhar o domínio final.

## Evidência visual

A imagem Open Graph existente fica em `artifacts/karaoke-queue/public/opengraph.jpg`. Capturas atualizadas de telas devem ser adicionadas em `docs/screenshots/` após o primeiro deploy com dados reais.

## Licença

MIT, conforme os manifests do projeto.
