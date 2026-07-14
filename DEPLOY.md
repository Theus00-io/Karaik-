# Deploy na Render

## Arquitetura recomendada

Use um **Web Service Node** para API + SPA e um **Render PostgreSQL**. O `render.yaml` na raiz cria ambos. A branch de entrega é `feat/professional-redesign-security` até a revisão e merge.

## Pré-requisitos

1. Repositório publicado no GitHub.
2. Conta Render com acesso ao repositório.
3. Senha forte para o primeiro operador.
4. Chave YouTube Data API v3, opcional.

## Deploy com Blueprint

1. Na Render, escolha **New > Blueprint**.
2. Conecte `Theus00-io/Karaik-`.
3. Selecione a branch `feat/professional-redesign-security`.
4. Confirme `render.yaml` na raiz; não configure Root Directory.
5. Informe `ADMIN_PASSWORD` quando solicitado. Use no mínimo 12 caracteres.
6. Informe `YOUTUBE_API_KEY` ou deixe vazia para o modo demonstração.
7. Aplique o Blueprint.

Configuração determinada pelo projeto:

- Runtime: Node
- Node: `24.14.1`
- Package manager: pnpm `10.17.1`
- Build: `pnpm install --frozen-lockfile && pnpm --filter @workspace/db run push && pnpm run build`
- Start: `pnpm --filter @workspace/api-server run start`
- Health check: `/api/healthz`
- Publish directory: não se aplica; o Express serve a SPA

## Variáveis

| Nome | Obrigatória | Origem |
|---|---:|---|
| `DATABASE_URL` | sim | injetada pelo banco do Blueprint |
| `SESSION_SECRET` | sim | gerada pela Render |
| `ADMIN_PASSWORD` | sim no primeiro deploy | secret manual, mínimo 12 caracteres |
| `ADMIN_USERNAME` | não | `admin` no Blueprint |
| `ADMIN_DISPLAY_NAME` | não | `Operador` no Blueprint |
| `YOUTUBE_API_KEY` | não | secret manual |
| `NODE_ENV` | sim | `production` |
| `LOG_LEVEL` | não | `info` |

`PORT` é injetada pela Render. Não salve valores reais em `.env`, `render.yaml` ou commits.

## Banco e schema

O build executa `drizzle-kit push` contra `DATABASE_URL`. Isso é suficiente para o schema atual, mas não fornece histórico/rollback de migração. Antes de mudanças destrutivas, gere migrações SQL versionadas, faça backup e substitua o `push` pela execução das migrações.

## Verificação pós-deploy

```bash
curl -i https://SEU-SERVICO.onrender.com/api/healthz
```

Espere HTTP 200 com `{"status":"ok"}` e headers `Content-Security-Policy`, `X-Content-Type-Options` e `X-Frame-Options`. Depois:

1. Entre em `/operator` com `ADMIN_USERNAME` e `ADMIN_PASSWORD`.
2. Crie uma sessão.
3. Faça uma reserva na home.
4. Confirme fila, player e logout.
5. Verifique os logs por erros de conexão ou CSP.

## Domínio e HTTPS

A Render fornece HTTPS no domínio `onrender.com`. Para domínio próprio, abra **Settings > Custom Domains**, configure os registros DNS mostrados e aguarde o certificado. Depois atualize canonical, Open Graph, `robots.txt` e `sitemap.xml` no frontend. Se front e API forem separados, configure `APP_ORIGIN` com a origem HTTPS exata, sem barra final.

## Logs e observabilidade

Os logs são JSON estruturado via Pino e omitem authorization, cookies e `set-cookie`. Consulte **Logs** no Web Service. A Render consulta `/api/healthz`; configure alerta externo adicional para disponibilidade e latência.

## Atualizações

Com Auto Deploy ativo, cada commit na branch selecionada instala pelo lockfile, aplica o schema, gera os bundles e reinicia o serviço. Antes do push rode:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm audit --prod
```

## Rollback

1. Em **Deploys**, selecione o último deploy estável e use **Rollback**.
2. Se o schema mudou, restaure o backup ou aplique a migração reversa validada; rollback do código não desfaz banco.
3. Confirme `/api/healthz` e os fluxos críticos.

## Problemas comuns

- **Startup falha com ADMIN_PASSWORD**: não existe operador e a senha está ausente ou tem menos de 12 caracteres.
- **Conexão PostgreSQL falha**: valide o vínculo `fromDatabase` e disponibilidade do banco.
- **Busca mostra demonstração**: configure `YOUTUBE_API_KEY` e confirme a API v3 habilitada.
- **Assets retornam 404**: confirme que `pnpm run build` gerou `artifacts/karaoke-queue/dist/public`.
- **401 nas ações do painel**: refaça login; a sessão expira em 8 horas e não sobrevive à troca de `SESSION_SECRET`.
- **CSP bloqueia recurso externo**: prefira recurso local; amplie a política apenas para origem necessária.
- **Canonical incorreto**: ajuste o hostname hardcoded após escolher nome/domínio final.
