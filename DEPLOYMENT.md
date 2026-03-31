# Deploy con GitHub Actions + GHCR + Dokploy

Esta app ya no debería compilarse dentro del VPS productivo. El flujo recomendado es:

1. GitHub Actions construye la imagen Docker.
2. GitHub Actions publica la imagen en `GHCR`.
3. GitHub Actions dispara el deploy en Dokploy usando la API.
4. Dokploy sólo hace `pull` de la imagen y reinicia el contenedor.

## Qué vive en cada sitio

### GitHub Actions

- construye la imagen
- publica `ghcr.io/<owner>/package-version-wizard:main`
- llama `POST /api/application.deploy` en Dokploy

### Dokploy

- ejecuta la app en el VPS
- guarda variables de entorno sensibles
- define dominio, healthcheck y estrategia de rollout
- no compila el repositorio

## 1. Preparar GitHub

1. En `Settings > Actions > General`, confirma que GitHub Actions está habilitado.
2. Si el repositorio o la organización restringen permisos, permite que el workflow declare permisos propios.
3. Añade estos secrets al repositorio:
   - `DOKPLOY_URL`: URL base de tu instancia, por ejemplo `https://dokploy.midominio.com`
   - `DOKPLOY_API_KEY`: token API generado en tu perfil de Dokploy
   - `DOKPLOY_APPLICATION_ID`: id interno de la app Docker en Dokploy
4. El workflow usa `GITHUB_TOKEN` para publicar en `ghcr.io`; no necesitas un PAT de escritura para la fase CI.

## 2. Publicar la imagen en GHCR

El workflow vive en [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) y hace esto:

- trigger en `push` a `main`
- trigger manual con `workflow_dispatch`
- `docker/setup-buildx-action`
- login en `ghcr.io`
- `docker/build-push-action` con cache `type=gha`
- deploy por API en Dokploy al terminar

La imagen objetivo queda en:

```text
ghcr.io/<github-owner>/package-version-wizard:main
```

## 3. Crear la app Docker temporal en Dokploy

No migres producción en caliente como primer corte. Crea primero una app paralela para validar el flujo.

1. En Dokploy crea una aplicación nueva.
2. En `Source Type` elige `Docker`.
3. Configura:
   - `Docker Image`: `ghcr.io/<owner>/package-version-wizard:main`
   - `Registry URL`: `ghcr.io`
   - `Username`: tu usuario u organización de GitHub
   - `Password`: un PAT clásico con `read:packages`
4. Mantén `Port = 3000`.
5. Copia exactamente las mismas variables de entorno que usa hoy la app productiva:
   - `DATABASE_URL`
   - `APP_BASE_URL`
   - `N8N_ANALYSIS_WEBHOOK_URL`
   - `N8N_ANALYSIS_WEBHOOK_TOKEN`
   - `N8N_CALLBACK_SECRET`
   - `N8N_API_BASE_URL`
   - `N8N_API_KEY`
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `SLACK_INSTALLATION_ENCRYPTION_KEY`
6. Asigna un subdominio temporal para smoke testing.

## 4. Obtener el `applicationId`

1. Genera un API token en tu perfil de Dokploy.
2. Consulta el listado de proyectos y servicios:

```bash
curl -X GET \
  'https://tu-dokploy.example.com/api/project.all' \
  -H 'accept: application/json' \
  -H 'x-api-key: TU_API_KEY'
```

3. Identifica el `applicationId` de la app Docker nueva.
4. Guarda ese id en el secret `DOKPLOY_APPLICATION_ID` de GitHub.

## 5. Configurar healthcheck y rollout

La app expone [`/health`](./src/routes/health/+server.ts) para que Dokploy valide el contenedor sin tocar lógica de negocio.

### Health Check

En `Advanced > Swarm Settings > Health Check` usa:

```json
{
	"Test": ["CMD", "curl", "-f", "http://localhost:3000/health"],
	"Interval": 30000000000,
	"Timeout": 10000000000,
	"StartPeriod": 30000000000,
	"Retries": 3
}
```

### Update Config

Primer corte conservador:

```json
{
	"Parallelism": 1,
	"Delay": 10000000000,
	"FailureAction": "rollback",
	"Order": "stop-first"
}
```

`docker/entrypoint.sh` ejecuta migraciones al arrancar mientras `RUN_DB_MIGRATIONS` siga en `true`. Por eso en esta fase no conviene `start-first`.

## 6. Validación del rollout

Después de hacer push a `main`:

1. GitHub Actions debe terminar en verde.
2. Debes ver una imagen nueva en GHCR con tag `main`.
3. Dokploy debe mostrar `pull` de imagen y deploy, no build local del repositorio.
4. Smoke test mínimo en el subdominio temporal:
   - `/`
   - `/health`
   - login
   - upload de `package.json`
   - polling de análisis
   - callback de `n8n`
   - vista `/analysis/[id]`

## 7. Corte a producción

Cuando la app temporal quede validada:

1. mueve el dominio productivo a la app Docker nueva, o
2. replica exactamente la misma configuración Docker en la app actual y apaga el flujo viejo basado en Git source.

Estado objetivo final:

- GitHub Actions construye y publica
- GHCR almacena imágenes versionadas
- Dokploy sólo despliega imágenes ya construidas
- el VPS deja de absorber el coste de build
