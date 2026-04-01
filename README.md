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

Se desplegaron dos instancias gp.nano para alojar `n8n` y `dokploy`
<img width="1821" height="623" alt="Image" src="https://github.com/user-attachments/assets/d7310258-467f-4ac4-a9a3-b138d5d90444" />

1. En `n8n` corren dos workflows que se complementan:

- `dependency-analysis`: es el workflow principal. Recibe el webhook privado desde la app cuando un usuario sube un `package.json`, valida el payload, normaliza y prioriza dependencias por riesgo, y usa un LLM de `Google Gemini` para convertir toda la investigación consolidada en un **resumen ejecutivo** y un **plan de upgrade por fases**. Después hace un callback firmado a la app para persistir el resultado y, si Slack está configurado, envía también el brief final con el enlace al análisis.

- `package-research`: es el subworkflow de investigación profunda. Se ejecuta solo para los paquetes más sensibles (`major`, `deprecated` o casos que requieren revisión manual), combina metadata del registro de `npm`, releases y documentación del repositorio con búsquedas externas usando `Tavily Search` y `Tavily Extract`, y finalmente vuelve a apoyarse en `Google Gemini` para estructurar la evidencia y generar un brief por paquete que luego consume el workflow principal.

<img width="3177" height="726" alt="Image" src="https://github.com/user-attachments/assets/32c2fda1-2713-43fb-8993-7516ed240db1" />

<img width="3081" height="1324" alt="Image" src="https://github.com/user-attachments/assets/d5bb29d0-01b4-45a5-aa71-4b5c95fd2298" />

2. En `Dokploy` corren dos servicios principales:

- La web SSR basada en `SvelteKit` con `adapter-node`. El flujo de entrega está preparado para que `GitHub Actions` construya la imagen Docker, la publique en `GHCR` y `Dokploy` haga el pull y el redeploy. Esto fue una decisión importante para adaptarme a las limitaciones de una VPS `nano`: compilar y desplegar directamente en el servidor consumía demasiada CPU y terminaba degradando o colapsando la instancia. Con este enfoque, CubePath queda enfocado en ejecutar la app, no en construirla.

- Una base de datos `PostgreSQL` persistente para almacenar usuarios, sesiones, proyectos, análisis, dependencias normalizadas, callbacks de `n8n` y configuración de Slack. Esto me permitió convertir el proyecto en una app full-stack real, con resultados persistidos, ownership por usuario y análisis compartibles, en lugar de dejarlo como una demo efímera.

<img width="2278" height="768" alt="Image" src="https://github.com/user-attachments/assets/579053b5-ba1d-4935-b152-3c65fc0a6f19" />


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
