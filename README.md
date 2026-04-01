# Package Version Wizard

Package Version Wizard es una app SSR para analizar `package.json` de proyectos npm. El flujo real del repo valida y parsea el archivo en servidor, consulta el registry de npm para enriquecer dependencias, persiste el análisis en Postgres, dispara un workflow privado de `n8n` y presenta un brief AI con plan de upgrade, detalle por paquete, fuentes y estado de notificación opcional en Slack.

## Qué incluye hoy

- Landing pública en `/`
- Login y registro en `/login`
- Upload autenticado en `/upload`
- Vista pública y compartible en `/analysis/[id]`
- Polling del análisis vía `/api/analyses/[id]`
- Callback de `n8n` verificado con secreto compartido en `/api/internal/n8n/callback`
- Integración Slack autenticada en `/settings/integrations/slack`
- Healthcheck en `/health`

## Stack real

- `SvelteKit 2` + `Svelte 5`
- `TypeScript`
- `Tailwind CSS v4`
- `Bun`
- `Postgres` mediante `Bun.SQL`
- `n8n` para orquestación del brief y la investigación por paquete
- `Slack OAuth` + publicación desde `n8n`
- `Docker` + `GHCR` + `Dokploy`

## Flujo principal

1. Un usuario autenticado sube un `package.json`.
2. El servidor valida el archivo, extrae dependencias y consulta npm para resolver versiones, riesgo y casos de revisión manual.
3. La app persiste `projects`, `analyses` y `analysis_dependencies`.
4. El backend construye el payload para `n8n`, incluyendo el contexto efectivo de Slack.
5. `n8n` sintetiza el brief, produce `upgradePlan`, `packageBriefs` y `sources`, y opcionalmente publica un mensaje en Slack.
6. `n8n` devuelve el resultado por callback protegido con secreto compartido.
7. La vista `/analysis/[id]` muestra el resumen renderizado, las dependencias priorizadas, el payload técnico y el estado de Slack.

## Quickstart

Requisitos mínimos:

- `Bun`
- una base de datos PostgreSQL accesible
- variables de entorno configuradas

Instalación y desarrollo:

```bash
bun install
bun run db:migrate
bun run dev
```

Validación:

```bash
bun run check
bun run build
```

Arranque del build productivo local:

```bash
bun run start
```

El runtime productivo de este repo se ejecuta con Bun. `node build/index.js` no es el comando principal válido porque la capa de datos depende de `Bun.SQL`.

## Variables de entorno

### Core analysis

- `DATABASE_URL`
- `N8N_ANALYSIS_WEBHOOK_URL`
- `N8N_ANALYSIS_WEBHOOK_TOKEN`
- `N8N_CALLBACK_SECRET`

### Recomendadas para URLs compartibles y OAuth

- `APP_BASE_URL`

### Opcionales para Slack

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_INSTALLATION_ENCRYPTION_KEY`
- `N8N_API_BASE_URL`
- `N8N_API_KEY`

La configuración editable de Slack quedó reducida a lo mínimo: canal, `Al completar` y `Al fallar`. El mensaje final no se arma en la UI; lo compone `n8n` con proyecto, estado, métricas, `slackDigestMd` y link al análisis. La credencial de Slack se sincroniza por workspace activo del usuario, no como credencial global compartida.

Consulta [`.env.example`](./.env.example) para el formato base.

## Workflows incluidos

- [`n8n/dependency-analysis.json`](./n8n/dependency-analysis.json): workflow principal que recibe el payload inicial, prioriza paquetes, sintetiza el brief final, resuelve Slack y hace callback a la app.
- [`n8n/package-research.json`](./n8n/package-research.json): subworkflow para investigación más profunda por paquete.

## Documentación

- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/database.md`](./docs/database.md)
- [`docs/deployment.md`](./docs/deployment.md)
