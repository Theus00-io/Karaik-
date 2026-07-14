# Relatório de auditoria técnica

Data: 14 de julho de 2026
Branch: `feat/professional-redesign-security`

## Resumo executivo

O repositório contém uma aplicação full-stack real em um monorepo pnpm. A única branch remota identificada inicialmente foi `main`; ela continha React/Vite, Express, PostgreSQL/Drizzle e OpenAPI. O projeto compilava tipos, mas não possuía testes/lint, não tinha configuração Render e apresentava falhas graves de autorização, privacidade e hardening.

A intervenção protegeu rotas administrativas, removeu CPF da fila pública, substituiu sessões em memória por tokens assinados, adicionou headers/rate limiting/erros seguros, corrigiu portabilidade Windows ARM64, criou testes e implantabilidade Render. O frontend recebeu hero responsivo, SVG narrativo, GSAP/ScrollTrigger modular, code splitting, foco e SEO.

## Estado inicial e achados

| Severidade | Achado inicial | Situação |
|---|---|---|
| Crítico | Ações de criar/alterar sessão e tocar/finalizar/pular/remover fila sem autenticação | Corrigido |
| Alto | CPF completo devolvido na fila pública | Corrigido |
| Alto | CORS refletia qualquer origem com credenciais | Corrigido |
| Alto | Credenciais padrão divulgadas, sem bootstrap real seguro | Corrigido; bootstrap exige secret |
| Alto | Sessão opaca apenas em memória, perdida a cada restart | Corrigido com token HMAC expirável |
| Médio | Cookie sem `Secure` em produção | Corrigido |
| Médio | Sem CSP, anti-clickjacking, nosniff, Referrer/Permissions Policy | Corrigido |
| Médio | Sem rate limiting em login/API | Corrigido |
| Médio | Erros assíncronos sem handler final seguro | Corrigido |
| Médio | `qs` transitivo vulnerável a DoS (GHSA-q8mj-m7cp-5q26) | Corrigido por override 6.15.2 |
| Médio | `preinstall` dependia de `sh`; build excluía binários Windows ARM64 | Corrigido |
| Médio | Sem testes, lint ou Blueprint Render | Corrigido |
| Baixo | HTML em inglês, descrição placeholder, sem canonical/sitemap | Corrigido |
| Melhoria | UI funcional, porém sem hero/narrativa/movimento reduzido explícito | Redesenhada |

## Melhorias implementadas

### Segurança

- Middleware `requireOperator` nas mutações administrativas e resumo operacional.
- Sessão HMAC-SHA256 stateless com expiração de 8 horas e comparação timing-safe.
- Cookies HttpOnly, SameSite Strict, Path `/` e Secure em produção.
- Hash `scrypt` para novas senhas, com compatibilidade PBKDF2 legada.
- Limite de 8 logins/15 minutos e 180 requisições/minuto por IP.
- CORS somente quando `APP_ORIGIN` é definido e proteção de origem em mutações.
- CSP compatível com YouTube, proteção contra framing, nosniff e políticas de referência/permissão.
- Body limitado a 32 KB, parser não estendido e mensagem genérica em falhas internas.
- Logs sensíveis redigidos e nenhum segredo real versionado.

### Frontend, UX e acessibilidade

- Hero editorial responsivo, CTA direto, status da sessão e SVG de onda/vinil.
- Hook GSAP reutilizável com `gsap.context`, `ScrollTrigger.matchMedia`, cleanup, transforms/opacidade e indicador de progresso.
- `prefers-reduced-motion`, skip link, foco visível, landmarks e rótulos acessíveis.
- Modal com `role=dialog`, `aria-modal`, título, fechamento por Escape e YouTube privacy-enhanced.
- Rodapé, metadados sociais, canonical, robots e sitemap.
- Detecção da própria entrada por ID de reserva, permitindo ocultar CPF da fila pública.

### Performance e manutenção

- Lazy loading/code splitting por rota com `React.lazy`.
- Build Vite com defaults locais seguros para porta/base.
- Assets de produção com cache imutável; HTML sem cache.
- Fonte carregada uma única vez com preconnect.
- ESLint flat config, Vitest e scripts padronizados.
- pnpm fixado em 10.17.1 e verificação de gerenciador multiplataforma.

## Arquivos principais

- `artifacts/api-server/src/lib/auth.ts`
- `artifacts/api-server/src/middlewares/security.ts`
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/operators.ts`
- `artifacts/api-server/src/routes/sessions.ts`
- `artifacts/api-server/src/routes/queue.ts`
- `artifacts/karaoke-queue/src/pages/Home.tsx`
- `artifacts/karaoke-queue/src/hooks/useGsapStory.ts`
- `artifacts/karaoke-queue/src/index.css`
- `render.yaml`, `.env.example`, `README.md`, `DEPLOY.md`

## Validação executada

| Verificação | Resultado |
|---|---|
| Instalação | passou com pnpm 10.17.1 |
| ESLint | passou, zero warnings |
| TypeScript | passou em libs, artifacts e scripts |
| Vitest | 3 arquivos, 5 testes, todos passaram |
| Frontend build | passou; `dist/public/index.html`, CSS e JS gerados |
| API build | passou; bundle `dist/index.mjs` de 2,2 MB + workers Pino |
| Auditoria de produção | zero vulnerabilidades após correção de `qs` |
| Health check HTTP | 200, corpo esperado e headers de segurança validados em teste |

O host de validação possui Node 26 ARM64, fora do intervalo suportado declarado; por isso o pnpm exibiu warning. Os testes e builds passaram mesmo assim. Produção está fixada em Node 24.14.1, versão padrão atual documentada pela Render na data da auditoria.

## Riscos residuais e recomendações

- **Alto:** CPF ainda funciona como prova de posse para consultar/cancelar reservas. Introduzir PIN aleatório por reserva e minimizar respostas com PII.
- **Médio:** `drizzle-kit push` não mantém histórico de migrações. Criar e testar migrações SQL antes de escala/alterações destrutivas.
- **Médio:** sessões assinadas não têm revogação central imediata; logout remove o cookie, mas um token copiado permanece válido até expirar. Adotar store Redis/DB para revogação se o risco justificar.
- **Médio:** não houve E2E contra PostgreSQL/YouTube reais nem auditoria Lighthouse em navegador nesta máquina.
- **Baixo:** rate limiting em memória é por instância; Redis é recomendado ao escalar horizontalmente.
- **Baixo:** canonical e sitemap precisam acompanhar o hostname final.
- **Melhoria:** substituir polling por SSE/WebSocket em eventos grandes e criar observabilidade de métricas/traces.
