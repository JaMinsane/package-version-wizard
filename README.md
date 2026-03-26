# Package Version Wizard

Package Version Wizard es una app full-stack construida con `SvelteKit + Bun + Tailwind + Postgres + n8n`.

El flujo principal no cambió: el usuario sube un `package.json`, el servidor analiza dependencias, dispara `n8n` para la investigación/síntesis AI y persiste un brief ejecutivo con trazabilidad por paquete.

La integración de Slack sí cambió de forma explícita:

> Subes tu `package.json`, recibes el análisis completo y, si lo configuras, Slack recibe un brief ejecutivo corto con deep link al análisis.

Slack ya no funciona como radar continuo ni como automatización recurrente. En esta base sólo existe como notificación final por canal.

## Estado actual del producto

- Landing pública en `/`
- Upload autenticado en `/upload`
- Login y registro en `/login`
- Vista pública compartible en `/analysis/[id]`
- Configuración autenticada de Slack en `/settings/integrations/slack`
- Callback interno firmado desde `n8n` en `/api/internal/n8n/callback`

## Flujo end-to-end

1. El usuario autenticado sube un `package.json`.
2. SvelteKit valida el archivo y persiste `project`, `analysis` y `analysis_dependencies`.
3. El backend resuelve `notificationContext.slack` desde:
   - workspace Slack instalado
   - defaults del usuario
   - override opcional del proyecto
4. La app llama el webhook privado `dependency-analysis` de `n8n`.
5. `n8n` investiga paquetes críticos, sintetiza el brief final y, si Slack está habilitado, publica el resultado con el nodo oficial de Slack.
6. `n8n` hace callback firmado a la app con:
   - `executiveSummaryMd`
   - `upgradePlan`
   - `packageBriefs`
   - `sources`
   - `slackDigestMd`
   - `slackNotification`
7. La vista `/analysis/[id]` muestra el resultado y el estado del último envío a Slack.

## Slack en esta migración

- Un solo workspace por despliegue
- OAuth de Slack manejado por la app
- Token bot guardado cifrado en Postgres
- La publicación la hace `n8n`, no el backend de SvelteKit
- La app nunca envía tokens de Slack en el webhook inicial
- La app sí envía configuración no sensible en `notificationContext.slack`
- Se notifica tanto en `completed` como en `failed`
- Si Slack falla, el análisis no pasa a `failed`; sólo queda auditado `slackNotification.status = failed`

## Variables de entorno de la app

Copia `.env.example` a `.env` y completa:

```bash
DATABASE_URL=
APP_BASE_URL=

N8N_ANALYSIS_WEBHOOK_URL=
N8N_ANALYSIS_WEBHOOK_TOKEN=
N8N_CALLBACK_SECRET=

N8N_API_BASE_URL=
N8N_API_KEY=

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_INSTALLATION_ENCRYPTION_KEY=
```

## Variables y secretos esperados en `n8n`

Los workflows exportados esperan estos valores dentro de `n8n`:

```bash
APP_CALLBACK_URL=
APP_CALLBACK_SECRET=
GROQ_API_KEY=
GITHUB_TOKEN=
TAVILY_API_KEY=
```

Notas:

- El webhook `dependency-analysis` usa `x-ingress-token` desde la app.
- El callback de `n8n` hacia SvelteKit usa:
  - `x-n8n-signature: APP_CALLBACK_SECRET`
  - `x-idempotency-key: <valor-unico>`
- El workflow `dependency-analysis` usa el nodo oficial de Slack con una credencial administrada que la app intenta sincronizar vía `N8N_API_BASE_URL` + `N8N_API_KEY`.

## Desarrollo

```bash
bun install
bun run db:migrate
bun run dev
```

## Verificación local

```bash
bun run check
bun run lint
```

## Producción

```bash
bun run build
bun run start
```

Si prefieres arrancar directamente el output de `adapter-node`, usa `node build/index.js`.

## Workflows incluidos

- `n8n/dependency-analysis.json`: workflow principal con tiers, síntesis AI, notificación a Slack y callback a la app
- `n8n/package-research.json`: investigación profunda por paquete

## Contrato relevante hacia `n8n`

Payload inicial resumido:

```json
{
	"analysisId": "analysis_...",
	"projectName": "mi-proyecto",
	"analysisUrl": "https://app.example.com/analysis/analysis_...",
	"dependencyStats": {
		"total": 32,
		"outdated": 10,
		"majors": 3,
		"deprecated": 1
	},
	"candidates": [],
	"notificationContext": {
		"slack": {
			"workspaceInstalled": true,
			"enabled": true,
			"channelId": "C123",
			"channelName": "deps-alerts",
			"notifyOnSuccess": true,
			"notifyOnFailure": true,
			"includeExecutiveBrief": true,
			"includeTopPackages": true,
			"topPackagesLimit": 3,
			"requestedByUserId": "user_...",
			"requestedByUserName": "Jane Doe"
		}
	}
}
```

Callback resumido:

```json
{
	"analysisId": "analysis_...",
	"status": "completed",
	"executiveSummaryMd": "...",
	"upgradePlan": [],
	"packageBriefs": [],
	"slackDigestMd": "...",
	"slackNotification": {
		"enabled": true,
		"attempted": true,
		"status": "sent",
		"channelId": "C123",
		"channelName": "deps-alerts",
		"notifiedAt": "2026-03-26T00:00:00.000Z"
	},
	"sources": []
}
```

## Documentación técnica

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`BD.md`](./BD.md)
