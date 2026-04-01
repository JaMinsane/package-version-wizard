# Arquitectura

## Visión general

Package Version Wizard es una app SSR construida con `SvelteKit` que analiza `package.json` de proyectos npm. El backend hace el trabajo sensible y persistente: valida uploads, consulta el registry de npm, guarda snapshots en Postgres, coordina el webhook privado a `n8n`, valida el callback con secreto compartido y expone una vista pública del resultado.

## Componentes principales

- **Web SSR**: UI, auth, formularios y renderizado del análisis.
- **Capa server-side**: parseo de `package.json`, enriquecimiento contra npm, persistencia y validación de callbacks.
- **Postgres con `Bun.SQL`**: usuarios, sesiones, proyectos, análisis, dependencias y configuración Slack.
- **`n8n`**: workflow principal [`n8n/dependency-analysis.json`](../n8n/dependency-analysis.json) y subworkflow [`n8n/package-research.json`](../n8n/package-research.json).
- **Slack**: OAuth desde la app, selección de canal en servidor y envío final desde `n8n`.

## Flujo end-to-end

1. El usuario autenticado sube un `package.json` en `/upload`.
2. El servidor valida el archivo, extrae dependencias y normaliza grupos soportados: `dependencies`, `devDependencies`, `peerDependencies` y `optionalDependencies`.
3. La app consulta npm para resolver `wantedVersion`, `latestVersion`, deprecaciones, nivel de riesgo y casos de revisión manual.
4. El análisis se persiste en Postgres con estado `queued`, pasa a `enriching` durante el enriquecimiento y luego a `summarizing` cuando `n8n` acepta el webhook.
5. El cliente hace polling a `/api/analyses/[id]` hasta recibir el resultado terminal.
6. `n8n` investiga paquetes sensibles, genera `executiveSummaryMd`, `upgradePlan`, `packageBriefs`, `sources` y resuelve el envío opcional a Slack.
7. La app valida el secreto compartido y la idempotencia del callback, renderiza el Markdown a HTML saneado y persiste el resultado final.
8. `/analysis/[id]` muestra el brief, dependencias priorizadas, fuentes, payload técnico y estado de Slack.

## Rutas actuales

### Públicas

- `/`
- `/login`
- `/analysis/[id]`
- `/health`

### Autenticadas

- `/upload`
- `/logout`
- `/settings/integrations/slack`
- `/settings/integrations/slack/connect`
- `/settings/integrations/slack/callback`

### Endpoints internos

- `/api/analyses/[id]`
- `/api/internal/n8n/callback`

## Auth y ownership

- La sesión vive en la cookie `session_token`.
- `projects.owner_user_id` define el owner del proyecto.
- La unicidad útil del proyecto es `(owner_user_id, slug)`.
- La lectura de `/analysis/[id]` es pública.
- Guardar defaults de Slack requiere usuario autenticado.
- Guardar overrides de Slack por proyecto requiere que el viewer sea el owner del proyecto analizado.

## Estados del análisis

- `queued`: análisis creado y persistido.
- `enriching`: backend consultando npm y preparando dependencias.
- `summarizing`: `n8n` aceptó el webhook y el workflow sigue en curso.
- `completed`: callback válido aplicado.
- `failed`: error terminal del flujo o callback inválido que no puede procesarse.

La lectura del análisis también detecta timeouts de estados no terminales y puede marcar la corrida como `failed` si excede los límites definidos en servidor.

## Contrato hacia n8n

La app envía un payload `N8nAnalysisRequest` con esta forma:

```json
{
	"analysisId": "analysis_123",
	"projectName": "mi-proyecto",
	"analysisUrl": "https://app.example.com/analysis/analysis_123",
	"dependencyStats": {
		"total": 32,
		"outdated": 10,
		"majors": 3,
		"deprecated": 1
	},
	"candidates": [
		{
			"name": "vite",
			"currentVersion": "^6.0.0",
			"latestVersion": "7.3.1",
			"group": "devDependencies",
			"diffType": "major",
			"deprecated": false,
			"riskScore": 80,
			"sourceUrls": ["https://www.npmjs.com/package/vite"],
			"resolution": {
				"declaredSpec": "^6.0.0",
				"specKind": "semver",
				"registryPackageName": "vite",
				"wantedVersion": "6.4.1",
				"latestVersion": "7.3.1",
				"comparisonStatus": "outdated",
				"requiresManualReview": false,
				"deprecationStatus": "none"
			}
		}
	],
	"notificationContext": {
		"slack": {
			"workspaceInstalled": true,
			"channelId": "C123",
			"channelName": "deps-alerts",
			"notifyOnSuccess": true,
			"notifyOnFailure": true,
			"requestedByUserId": "user_123",
			"requestedByUserName": "Jane Doe"
		}
	}
}
```

Notas relevantes:

- `candidates` incluye dependencias con cambio real, deprecación o revisión manual.
- El webhook usa `x-ingress-token`.
- La URL del webhook se resuelve desde `N8N_ANALYSIS_WEBHOOK_URL`.

## Contrato de callback

`n8n` devuelve un `N8nAnalysisCallback` cuyo header `x-n8n-signature` debe coincidir con `N8N_CALLBACK_SECRET`, y además exige `x-idempotency-key`.

```json
{
	"analysisId": "analysis_123",
	"status": "completed",
	"executiveSummaryMd": "Resumen ejecutivo en Markdown",
	"upgradePlan": [
		{
			"wave": 1,
			"title": "Fase 1 - Quick wins",
			"rationale": "Aplicar upgrades de menor riesgo primero.",
			"packages": ["vite", "eslint"]
		}
	],
	"packageBriefs": [],
	"slackDigestMd": "Digest corto para Slack",
	"slackNotification": {
		"attempted": true,
		"status": "sent",
		"channelId": "C123",
		"channelName": "deps-alerts",
		"notifiedAt": "2026-03-31T00:00:00.000Z"
	},
	"sources": []
}
```

`status` puede ser `completed` o `failed`. En caso de fallo, la app persiste el mensaje recibido como resumen de error y mantiene el snapshot técnico para diagnóstico.

## Render del brief

El resumen AI llega en Markdown y se procesa en servidor:

1. `marked` convierte Markdown a HTML.
2. `sanitize-html` limpia el resultado.
3. La vista renderiza el HTML saneado con `{@html ...}`.
4. Tailwind Typography se usa solo para el bloque de contenido del brief.

La implementación vive en [`src/lib/server/markdown.ts`](../src/lib/server/markdown.ts).

## Integración Slack

### Modelo actual

- Un workspace activo por usuario.
- Instalación vía OAuth desde la app.
- Token bot cifrado en Postgres.
- Sincronización de una credencial administrada en `n8n` por workspace activo del usuario.
- Envío final desde el nodo oficial de Slack dentro del workflow principal.

### Resolución de configuración

El contexto efectivo de Slack se calcula en servidor combinando:

1. workspace activo del usuario
2. defaults del usuario
3. override del proyecto

Si falta workspace, canal o sincronización con `n8n`, el análisis sigue corriendo y el contexto se manda con `reason` para que el workflow registre el resultado operativo. Si `notifyOnSuccess` y `notifyOnFailure` están en `false`, la notificación queda en pausa sin borrar el canal guardado.

### Configuración expuesta

- Defaults por usuario en `/settings/integrations/slack`
- Override por proyecto desde la sidebar de `/analysis/[id]`
- Selector de canales visible solo para canales accesibles por el bot
- Configuración mínima: `channel`, `notifyOnSuccess`, `notifyOnFailure`
- El mensaje final lo decide el workflow y siempre incluye proyecto, estado, métricas, `slackDigestMd` y link al análisis

## Vista de análisis

La página `/analysis/[id]` combina:

- brief renderizado
- fases del plan de upgrade
- dependencias que requieren acción
- dependencias cubiertas por el spec actual
- package briefs
- fuentes
- panel técnico con payload enviado y callback recibido
- bloque de estado Slack y formulario de override cuando el owner está autenticado
