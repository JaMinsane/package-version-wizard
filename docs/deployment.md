# Deploy

## Resumen

El pipeline actual construye la imagen en GitHub Actions, la publica en `GHCR` y dispara el deploy en Dokploy por API. El VPS ejecuta la imagen ya construida; no compila el repositorio en producción.

## Pipeline actual

El workflow vive en [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) y hace lo siguiente:

1. checkout del repo
2. resolución de coordenadas de imagen
3. setup de `buildx`
4. login en `ghcr.io`
5. build y push de `ghcr.io/<owner>/<repo>:main`
6. espera corta para propagación del registry
7. `POST /api/application.deploy` a Dokploy

Triggers activos:

- `push` a `main`
- `workflow_dispatch`

## Runtime del contenedor

La imagen se construye desde [`../Dockerfile`](../Dockerfile). El runtime:

- expone `PORT=3000`
- ejecuta [`../docker/entrypoint.sh`](../docker/entrypoint.sh)
- corre migraciones al arrancar mientras `RUN_DB_MIGRATIONS` no sea `false`
- inicia la app con `bun run start`

Este repo usa `Bun.SQL` en servidor. Por eso el runtime productivo debe ejecutarse con Bun. `node build/index.js` no es el comando principal válido en producción.

## Variables de entorno en producción

Mínimas para análisis:

- `DATABASE_URL`
- `N8N_ANALYSIS_WEBHOOK_URL`
- `N8N_ANALYSIS_WEBHOOK_TOKEN`
- `N8N_CALLBACK_SECRET`

Recomendadas:

- `APP_BASE_URL`

Opcionales para Slack:

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_INSTALLATION_ENCRYPTION_KEY`
- `N8N_API_BASE_URL`
- `N8N_API_KEY`

Después de aplicar la migración que invalida la credencial global legacy de Slack, cada usuario debe reconectar su workspace para resincronizar la credencial por workspace en `n8n`.

Variables operativas del contenedor:

- `HOST`
- `PORT`
- `BODY_SIZE_LIMIT`
- `RUN_DB_MIGRATIONS`

## Configuración en Dokploy

Usa una aplicación de tipo `Docker`:

- `Docker Image`: `ghcr.io/<owner>/package-version-wizard:main`
- `Registry URL`: `ghcr.io`
- `Username`: usuario u organización de GitHub
- `Password`: token con `read:packages`
- `Port`: `3000`

Secrets esperados en GitHub para el deploy:

- `DOKPLOY_URL`
- `DOKPLOY_API_KEY`
- `DOKPLOY_APPLICATION_ID`

## Healthcheck

La app expone [`../src/routes/health/+server.ts`](../src/routes/health/+server.ts), que responde:

```json
{
	"status": "ok",
	"service": "package-version-wizard",
	"timestamp": "..."
}
```

Configuración sugerida en Dokploy:

```json
{
	"Test": ["CMD", "curl", "-f", "http://localhost:3000/health"],
	"Interval": 30000000000,
	"Timeout": 10000000000,
	"StartPeriod": 30000000000,
	"Retries": 3
}
```

Como el entrypoint puede aplicar migraciones al arranque, una estrategia conservadora de rollout sigue siendo `stop-first`.

## Validación local del build productivo

```bash
bun run build
bun run start
```

Smoke test recomendado:

- `/`
- `/login`
- `/upload`
- `/health`
- polling de `/api/analyses/[id]`
- callback de `n8n`
- `/analysis/[id]`

## Notas operativas

- Dokploy debe hacer `pull` de imagen, no build del repositorio.
- Si quieres desactivar migraciones automáticas en runtime, usa `RUN_DB_MIGRATIONS=false`.
- La integración Slack depende de variables opcionales y de conectividad saliente tanto hacia Slack como hacia la API de `n8n`.
