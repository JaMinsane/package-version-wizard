# Package Version Wizard Architecture

## Producto

Package Version Wizard es un copiloto de upgrades para proyectos npm.

El usuario sube un `package.json`, el backend hace el análisis determinista y `n8n` genera el brief ejecutivo con investigación por paquete. El resultado final queda persistido y compartible.

La propuesta actual del producto es:

> Subes tu `package.json`, recibes el análisis completo y, si lo configuras, Slack recibe un brief ejecutivo corto con deep link al análisis.

Slack ya no es radar continuo. No existe `dependency-radar`, no existen suscripciones recurrentes y no existen endpoints internos de radar.

## Objetivos

- Mantener intacto el flujo de upload y procesamiento de `package.json`
- Desacoplar el trabajo lento usando `analysis` persistidos
- Dejar la lectura de `/analysis/[id]` pública y compartible
- Exigir auth para configurar Slack
- Persistir ownership real por usuario
- Entregar una integración Slack limpia, sin fallbacks legacy

## Stack

- Runtime: `Bun`
- Framework: `SvelteKit`
- Lenguaje: `TypeScript`
- UI: `Tailwind CSS v4`
- Persistencia: `Postgres` con `Bun.SQL`
- Orquestación AI e integración Slack: `n8n`
- Deploy target: VPS / Dokploy

## Arquitectura general

```text
Browser
  -> /upload (auth)
  -> SvelteKit valida y persiste
  -> SvelteKit resuelve notificationContext.slack
  -> SvelteKit llama webhook privado de n8n
  -> Browser hace polling a /api/analyses/[id]

n8n
  -> investiga paquetes críticos
  -> sintetiza executive summary + upgrade plan
  -> construye payload para Slack
  -> usa nodo oficial de Slack
  -> hace callback firmado a la app

SvelteKit
  -> valida callback
  -> persiste artefactos AI
  -> persiste auditoría de Slack
  -> expone análisis público y settings privados
```

## Rutas

### Públicas

- `/`
- `/analysis/[id]`
- `/login`

### Autenticadas

- `/upload`
- `/settings/integrations/slack`
- `/settings/integrations/slack/connect`

### Internas

- `/api/analyses/[id]`
- `/api/internal/n8n/callback`

## Ownership y auth

La app ya tiene usuarios y sesiones.

- `projects.owner_user_id` determina ownership real
- `slug` ya no es global; la unicidad útil es `(owner_user_id, slug)`
- dos usuarios pueden tener proyectos con el mismo nombre sin colisionar
- la lectura de `/analysis/[id]` puede seguir siendo pública
- guardar defaults Slack y overrides por proyecto requiere usuario autenticado
- mutar Slack de un proyecto exige que el viewer sea el owner del proyecto

## Backend SvelteKit

### Responsabilidades

- validar el upload
- parsear `package.json`
- enriquecer dependencias con npm registry
- calcular stats y riesgo preliminar
- persistir análisis y dependencias
- resolver `notificationContext.slack`
- llamar el webhook privado de `n8n`
- validar callback firmado
- transformar Markdown a HTML saneado
- auditar el resultado de entrega a Slack

### Contrato hacia `n8n`

`N8nAnalysisRequest` ahora incluye:

```ts
interface N8nAnalysisRequest {
	analysisId: string;
	projectName: string;
	analysisUrl?: string;
	dependencyStats: {
		total: number;
		outdated: number;
		majors: number;
		deprecated: number;
	};
	candidates: DependencyCandidate[];
	notificationContext: {
		slack: {
			workspaceInstalled: boolean;
			enabled: boolean;
			channelId?: string;
			channelName?: string;
			notifyOnSuccess: boolean;
			notifyOnFailure: boolean;
			includeExecutiveBrief: boolean;
			includeTopPackages: boolean;
			topPackagesLimit: number;
			requestedByUserId: string;
			requestedByUserName: string;
			reason?: string;
		};
	};
}
```

La resolución del contexto Slack ocurre en servidor combinando:

- workspace Slack instalado
- defaults del usuario
- override del proyecto

Si no hay workspace, si n8n no tiene la credencial sincronizada o si no hay canal configurado, el backend manda igualmente el request con `slack.enabled = false` o con `reason` para que el workflow registre el skip sin romper el análisis.

### Contrato de callback

`N8nAnalysisCallback` ahora incluye:

```ts
interface N8nAnalysisCallback {
	analysisId: string;
	status: 'completed' | 'failed';
	executiveSummaryMd: string;
	upgradePlan: UpgradePhase[];
	packageBriefs: PackageBrief[];
	slackDigestMd?: string;
	slackNotification?: {
		enabled: boolean;
		attempted: boolean;
		status: 'sent' | 'skipped' | 'failed';
		channelId?: string;
		channelName?: string;
		reason?: string;
		notifiedAt?: string;
	};
	sources: SourceLink[];
}
```

La app persiste `slackNotification` dentro de `analyses.slack_notification_json`.

## Integración Slack

### Modelo elegido

- workspace único por despliegue
- instalación vía OAuth desde la app
- token bot cifrado en Postgres
- publicación real desde `n8n` con el nodo oficial de Slack
- una sola credencial administrada en `n8n`

### Flujo de instalación

1. Usuario autenticado entra a `/settings/integrations/slack`
2. La app redirige a Slack OAuth
3. Slack vuelve a `/settings/integrations/slack/callback`
4. La app intercambia el `code`
5. Guarda `team`, `scope`, `bot_user_id` y token cifrado en `slack_workspaces`
6. Intenta sincronizar la credencial administrada en `n8n`
7. La UI muestra estado del workspace y estado de sync con `n8n`

### Selección de canal

- La app consulta canales usando el token guardado
- El selector sólo usa canales visibles para el bot
- Si el canal privado no tiene invitado al bot, no se puede guardar

### Configuración disponible

Defaults por usuario:

- `enabled`
- `channelId`
- `notifyOnSuccess`
- `notifyOnFailure`
- `includeExecutiveBrief`
- `includeTopPackages`
- `topPackagesLimit`

Overrides por proyecto:

- `inheritUserDefaults`
- `enabled`
- `channelId`
- `notifyOnSuccess`
- `notifyOnFailure`
- `includeExecutiveBrief`
- `includeTopPackages`
- `topPackagesLimit`

## Workflow `n8n/dependency-analysis`

La notificación a Slack vive dentro del workflow principal.

### Camino principal

1. `Webhook`
2. `Validate input`
3. `Normalize candidates`
4. `Normalize notification context`
5. `Tier packages`
6. investigación profunda por paquete
7. síntesis ejecutiva
8. `Build Slack success payload`
9. `IF Slack success?`
10. `Slack success`
11. `Finalize Slack success result`
12. `Build completed callback`
13. `HTTP Request: callback app`

### Camino de error/degradación

1. `Build Slack failure payload`
2. `IF Slack failure?`
3. `Slack failure`
4. `Finalize Slack failure result`
5. `Build failed callback`
6. `HTTP Request: callback app`

### Regla de resiliencia

Slack nunca define el estado del análisis.

- si Slack sale bien: `slackNotification.status = sent`
- si Slack se omite por configuración: `slackNotification.status = skipped`
- si Slack falla: `slackNotification.status = failed`
- el análisis sigue `completed` o `failed` por el resultado del workflow, no por el nodo de Slack

### Mensaje enviado a Slack

Éxito:

- proyecto
- estado `completed`
- resumen ejecutivo corto
- conteos de `outdated`, `majors`, `deprecated`
- top paquetes destacados
- link al análisis completo

Fallo:

- proyecto
- estado `failed`
- motivo corto
- link al análisis

## UI

### Upload

No se toca la mecánica del upload.

La configuración Slack salió del formulario de subida. El upload sólo dispara el análisis.

### Settings Slack

`/settings/integrations/slack` permite:

- instalar o reconectar Slack
- ver el workspace activo
- ver el estado de sync con `n8n`
- elegir canal default
- activar o desactivar éxito/fallo
- definir brief corto y highlights

### Vista de análisis

`/analysis/[id]` ahora muestra:

- estado del análisis
- webhook/callback
- estado del último envío a Slack
- panel de configuración Slack sólo para el owner autenticado

No hay copy ni estados de radar continuo.

## Persistencia

Tablas nuevas o relevantes para esta migración:

- `projects.owner_user_id`
- `slack_workspaces`
- `user_slack_preferences`
- `project_notification_settings`
- `analyses.slack_notification_json`

El detalle está en [`BD.md`](./BD.md).

## Variables de entorno

### App

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

### n8n

- `APP_CALLBACK_URL`
- `APP_CALLBACK_SECRET`
- `GROQ_API_KEY`
- `GITHUB_TOKEN`
- `TAVILY_API_KEY`

## Decisiones descartadas

- no revivir `automation_subscriptions`
- no recrear endpoints `/api/internal/radar/*`
- no enviar tokens de Slack dentro del webhook inicial
- no usar `SLACK_WEBHOOK_URL`
- no usar nodos HTTP forzados a `slack.com`
- no introducir compatibilidad runtime con el modelo legacy
