# Package Version Wizard

Package Version Wizard es un copiloto de upgrades para proyectos npm. El usuario sube su `package.json` y la app ejecuta un flujo full-stack: valida y parsea el archivo en el servidor, consulta el registro de npm para detectar dependencias outdated, major y deprecated, prioriza el riesgo y dispara un workflow en `n8n` para generar un brief AI accionable. Además, la plataforma incluye login y base de datos para proteger el flujo de subida y la configuración de integraciones, así como para persistir usuarios, proyectos, análisis y preferencias de notificación, de modo que cada resultado quede asociado a su usuario y pueda consultarse después.

El resultado no es solo una lista de versiones nuevas: cada análisis queda persistido con una URL compartible e incluye resumen ejecutivo, plan de upgrade por fases, detalle por paquete, fuentes trazables y una separación clara entre lo que realmente requiere cambio en el `package.json` y lo que ya está cubierto por el rango declarado. Además, de forma opcional, puede enviar el AI brief final a Slack con el link del análisis.

Stack principal: SSR web basada en `SvelteKit + Bun + TypeScript + Tailwind CSS` y backend con `Postgres + n8n + Slack API`.

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

## Producción

El flujo recomendado para VPS + Dokploy ya no es compilar en el servidor. La app está preparada para:

1. construir la imagen en GitHub Actions
2. publicar la imagen en GHCR
3. disparar el deploy en Dokploy vía API

La guía operativa completa está en [`DEPLOYMENT.md`](./DEPLOYMENT.md).

Si necesitas validar localmente el runtime productivo:

```bash
bun run build
bun run start
```

También puedes arrancar directamente el output de `adapter-node` con `node build/index.js`.

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
- [`DEPLOYMENT.md`](./DEPLOYMENT.md)
