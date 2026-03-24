# Package Version Wizard Architecture

## Visión del producto

Package Version Wizard será un **copilot de upgrades** para proyectos npm. El usuario sube un `package.json`, el backend analiza las dependencias de forma determinista, consulta versiones recientes, detecta riesgo técnico y delega a `n8n` la orquestación AI para producir un brief accionable.

La experiencia debe sentirse rápida y premium para demo:

- upload inmediato y claro
- análisis progresivo con estados visibles
- resultado útil para developers, no solo resúmenes
- automatizaciones que demuestren valor continuo más allá del primer upload

La propuesta que queremos vender al jurado es simple:

> “Subes tu `package.json` y en minutos obtienes un plan de upgrade priorizado, con riesgo, validaciones sugeridas, brief ejecutivo y automatizaciones para monitorear cambios futuros”.

## Objetivos de arquitectura

- Entregar un MVP funcional de punta a punta sin sobreingeniería.
- Mantener separación estricta entre cliente, servidor y automatizaciones.
- Hacer que la UX sea síncrona para el usuario, pero desacoplar el trabajo lento en jobs persistidos.
- Diseñar el sistema para crecer hacia monitoreo continuo y automatizaciones sin rehacer la base.
- Mantener la arquitectura compatible con despliegue en VPS usando Dokploy.

## Stack decidido

### Aplicación principal

- Runtime y package manager: `Bun`
- Framework: `SvelteKit`
- Lenguaje: `TypeScript`
- UI: `Tailwind CSS v4`
- Tailwind plugins: `@tailwindcss/forms`, `@tailwindcss/typography`
- Adaptador de producción: `@sveltejs/adapter-node`

### Persistencia e integraciones

- Base de datos: `Postgres`
- Hub de automatización y AI: `n8n`
- Fuente de verdad para estado del producto: `SvelteKit + Postgres`
- Canal de notificaciones estrella: `Slack`

## Principios de diseño

- El frontend solo presenta estado y recoge interacciones.
- Todo lo sensible ocurre en el servidor.
- `n8n` orquesta AI, enriquecimientos y automatizaciones, pero no actúa como base de datos principal.
- El sistema debe funcionar incluso si el workflow AI tarda varios segundos o minutos.
- Cada análisis debe ser recuperable por URL compartible.

## Arquitectura general

```text
Browser
  -> SvelteKit form action
  -> Postgres (crea analysis + dependencias)
  -> SvelteKit dispara webhook a n8n
  -> Browser hace polling corto al estado del analysis

n8n
  -> orquesta tiers de investigación y síntesis final
  -> ejecuta `package-research` para paquetes top-risk
  -> genera upgrade plan + brief + digest de Slack con fuentes trazables
  -> callback firmado a SvelteKit

SvelteKit
  -> valida callback
  -> persiste artefactos AI
  -> expone resultado final a la UI y vistas compartibles
```

## Experiencia de usuario

### Flujo principal

1. El usuario entra al wizard en `/`.
2. Sube un `package.json` con un CTA claro.
3. El servidor valida y crea un análisis.
4. La UI cambia a un estado de progreso premium en la misma vista.
5. El frontend consulta el estado del job mediante polling corto.
6. Cuando el análisis termina, la vista muestra:
   - resumen ejecutivo AI
   - buckets de riesgo
   - plan de upgrade por waves
   - highlights de paquetes críticos
   - notas de test focus y rollback
7. El usuario puede abrir una vista compartible en `/analysis/[id]`.

### UX síncrona premium con implementación robusta

Aunque la experiencia es “esperar el resultado en la misma pantalla”, internamente se implementa como un job persistido:

- el `POST /` crea el análisis y devuelve `analysisId`
- el frontend no bloquea el request esperando a `n8n`
- la UI hace polling corto a `GET /api/analyses/[id]`
- si el usuario recarga o comparte la URL, el análisis sigue recuperable

Esto evita timeouts, mantiene SSR friendly el proyecto y simplifica la resiliencia.

## Arquitectura frontend

### Rutas

- `src/routes/+page.svelte`
  - landing + upload wizard + estados de progreso
- `src/routes/+page.server.ts`
  - form action principal para recibir `package.json`
- `src/routes/analysis/[id]/+page.server.ts`
  - carga SSR del análisis persistido
- `src/routes/analysis/[id]/+page.svelte`
  - presentación detallada y compartible del resultado
- `src/routes/api/analyses/[id]/+server.ts`
  - endpoint de estado para polling
- `src/routes/api/internal/n8n/callback/+server.ts`
  - callback firmado desde `n8n`

### Componentes esperados

- Hero técnico con promesa clara del producto
- Upload card con drag and drop opcional, pero siempre soportando `<input type="file">`
- Progress shell con estados `queued`, `enriching`, `summarizing`
- Summary panel para el brief ejecutivo
- Risk buckets con visualización clara de `major`, `minor`, `patch`, `deprecated`
- Upgrade waves con orden sugerido de ejecución
- Package cards con señales accionables y fuentes

### Filosofía de presentación

- No usar `prose` en todo el shell
- Reservar `prose` para el resumen AI ya transformado a HTML saneado
- Mantener una estética más “developer intelligence dashboard” que “blog corporativo”

## Arquitectura backend

### Responsabilidades del servidor SvelteKit

El backend propio conserva todas las partes deterministas y sensibles:

- recibir y validar el upload
- parsear `package.json`
- extraer y normalizar dependencias
- consultar npm registry para versión estable más reciente y metadatos públicos
- calcular métricas base y scoring preliminar de riesgo
- persistir análisis, dependencias y snapshots
- disparar el workflow de `n8n`
- exponer el estado y el resultado del análisis
- validar callbacks firmados
- convertir Markdown AI a HTML saneado antes de renderizar

### Responsabilidades de n8n

`n8n` se usará como automation hub:

- orquestar pasos de enriquecimiento multi-fuente
- invocar LLM para resumen y clasificación
- generar artefactos de producto derivados
- ejecutar workflows recurrentes
- enviar notificaciones a Slack

### Responsabilidades que no estarán en el MVP

- autenticación multiusuario
- colas dedicadas tipo Redis/BullMQ
- microservicios separados
- procesamiento de monorepos
- soporte de lockfiles como input principal

## Modelo de dominio

### Estados del análisis

```ts
type AnalysisStatus = 'queued' | 'enriching' | 'summarizing' | 'completed' | 'failed';
```

Semántica:

- `queued`: análisis creado y pendiente de procesamiento
- `enriching`: backend y/o `n8n` enriqueciendo metadatos y fuentes
- `summarizing`: LLM generando brief y plan de upgrade
- `completed`: resultado final persistido y listo para UI
- `failed`: error terminal o callback inválido

### Tipos principales

```ts
type AnalysisStatus = 'queued' | 'enriching' | 'summarizing' | 'completed' | 'failed';

interface DependencyCandidate {
  name: string;
  currentVersion: string;
  latestVersion: string;
  group: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
  diffType: 'patch' | 'minor' | 'major' | 'unknown';
  deprecated: boolean;
  publishedAt?: string;
  repositoryUrl?: string;
  riskScore: number;
  sourceUrls: string[];
}

interface N8nAnalysisRequest {
  analysisId: string;
  projectName: string;
  dependencyStats: { total: number; outdated: number; majors: number; deprecated: number };
  candidates: DependencyCandidate[];
}

interface N8nAnalysisCallback {
  analysisId: string;
  status: 'completed' | 'failed';
  executiveSummaryMd: string;
  upgradePlan: { wave: number; title: string; rationale: string; packages: string[] }[];
  packageBriefs: {
    name: string;
    summary: string;
    breakingChanges: string[];
    testFocus: string[];
    riskLevel: 'low' | 'medium' | 'high';
    confidence: 'low' | 'medium' | 'high';
    evidenceStatus: 'verified' | 'partial' | 'none';
    recommendedActions: string[];
    sources: {
      packageName: string;
      label:
        | 'npm'
        | 'github-release'
        | 'changelog'
        | 'migration-guide'
        | 'docs'
        | 'fallback-search'
        | 'repository';
      url: string;
    }[];
  }[];
  slackDigestMd?: string;
  sources: {
    packageName: string;
    label:
      | 'npm'
      | 'github-release'
      | 'changelog'
      | 'migration-guide'
      | 'docs'
      | 'fallback-search'
      | 'repository';
    url: string;
  }[];
}
```

### Resultado de análisis para UI

Además del callback anterior, el backend expondrá un shape orientado a la vista:

```ts
interface AnalysisResult {
  id: string;
  status: AnalysisStatus;
  projectName: string;
  createdAt: string;
  progressLabel: string;
  stats: {
    total: number;
    outdated: number;
    majors: number;
    minors: number;
    patches: number;
    deprecated: number;
  };
  summaryHtml?: string;
  upgradePlan?: {
    wave: number;
    title: string;
    rationale: string;
    packages: string[];
  }[];
  dependencies: DependencyCandidate[];
  packageBriefs?: {
    name: string;
    summary: string;
    breakingChanges: string[];
    testFocus: string[];
    riskLevel: 'low' | 'medium' | 'high';
    confidence: 'low' | 'medium' | 'high';
    evidenceStatus: 'verified' | 'partial' | 'none';
    recommendedActions: string[];
    sources: {
      packageName: string;
      label:
        | 'npm'
        | 'github-release'
        | 'changelog'
        | 'migration-guide'
        | 'docs'
        | 'fallback-search'
        | 'repository';
      url: string;
    }[];
  }[];
  sources?: {
    packageName: string;
    label:
      | 'npm'
      | 'github-release'
      | 'changelog'
      | 'migration-guide'
      | 'docs'
      | 'fallback-search'
      | 'repository';
    url: string;
  }[];
}
```

## Persistencia en Postgres

El sistema usará `Postgres` desde el inicio para evitar rehacer el modelo cuando se agreguen historial, rechecks y notificaciones.

### Tablas base

#### `projects`

Propósito:

- representar una identidad lógica del proyecto analizado
- reutilizar historial si en el futuro se soporta seguimiento continuo

Campos sugeridos:

- `id`
- `slug`
- `name`
- `ecosystem` con valor inicial fijo `npm`
- `created_at`
- `updated_at`

#### `analyses`

Propósito:

- snapshot de una corrida concreta

Campos sugeridos:

- `id`
- `project_id`
- `status`
- `manifest_name`
- `manifest_json`
- `stats_json`
- `summary_markdown`
- `summary_html`
- `upgrade_plan_json`
- `package_briefs_json`
- `slack_digest_markdown`
- `error_message`
- `n8n_execution_id`
- `created_at`
- `updated_at`
- `completed_at`

#### `analysis_dependencies`

Propósito:

- snapshot normalizado de dependencias por análisis

Campos sugeridos:

- `id`
- `analysis_id`
- `name`
- `dependency_group`
- `current_version`
- `latest_version`
- `diff_type`
- `deprecated`
- `published_at`
- `repository_url`
- `risk_score`
- `decision`
- `source_urls_json`

`decision` deberá permitir valores como:

- `upgrade_now`
- `upgrade_later`
- `replace`
- `hold`

#### `automation_subscriptions`

Propósito:

- configurar rechecks y alertas posteriores

Campos sugeridos:

- `id`
- `project_id`
- `channel_type`
- `channel_target`
- `enabled`
- `frequency`
- `last_sent_at`
- `created_at`
- `updated_at`

### Estrategia de acceso a datos

- Usar SQL tipado o query builder ligero.
- Evitar ORM pesado por velocidad de ejecución y menor sobrecarga conceptual.
- Mantener repositorios simples en `src/lib/server`.

## Contratos HTTP

## `POST /`

Form action nativa de SvelteKit.

Responsabilidades:

- recibir multipart con archivo
- validar tamaño, tipo y contenido JSON
- crear `project` y `analysis`
- calcular stats preliminares
- persistir dependencias normalizadas
- disparar el webhook a `n8n`
- devolver `analysisId`

Respuesta lógica esperada para la UI:

```ts
{
  success: true,
  analysisId: string,
  redirectTo: `/analysis/${analysisId}`
}
```

## `GET /api/analyses/[id]`

Devuelve el estado de progreso y, cuando existe, el resultado final.

```ts
{
  status: AnalysisStatus,
  progressLabel: string,
  analysis?: AnalysisResult
}
```

## `POST /api/internal/n8n/callback`

Callback interno desde `n8n`.

Reglas:

- solo servidor a servidor
- protegido con shared secret
- validación estricta del payload
- idempotente ante retries
- no aceptar HTML libre

Headers esperados:

- `x-n8n-signature`
- `x-idempotency-key`

Comportamiento:

- valida firma
- verifica que el `analysisId` exista
- ignora callbacks duplicados ya aplicados
- actualiza estado y persiste artefactos derivados

## Seguridad y validación

### Uploads

- aceptar solo archivos `.json`
- límite de tamaño estricto, por ejemplo `1 MB`
- parseo defensivo con mensajes de error claros
- rechazo explícito de manifests sin dependencias

### Webhooks

- secretos solo desde `$env/static/private` o `$env/dynamic/private`
- callback de `n8n` con firma HMAC o token compartido
- idempotency key persistida o deduplicada contra `analysisId + payload hash`

### Render de AI

Si el resumen llega como Markdown:

1. convertir Markdown a HTML en servidor
2. sanear HTML en servidor
3. persistir `summary_html`
4. renderizar con `{@html ...}` solo sobre contenido saneado

## Lógica de análisis determinista

La app no debe delegar todo a AI. Antes de llamar a `n8n`, el backend genera valor real.

### Parsing de `package.json`

- leer `name`, `version`
- extraer:
  - `dependencies`
  - `devDependencies`
  - `peerDependencies`
  - `optionalDependencies`

### Normalización

- ignorar dependencias sin string válido
- conservar el rango original como `currentVersion`
- marcar grupo de pertenencia

### Enriquecimiento base desde npm

Por cada dependencia:

- obtener `dist-tags.latest`
- revisar metadata pública
- detectar `deprecated`
- guardar `repository.url` si existe
- guardar fecha de publicación más reciente disponible

### Clasificación de diffs

- `patch`, `minor`, `major` o `unknown`
- si el rango no permite inferencia confiable, usar `unknown`

### Pre-scoring de riesgo

Heurística inicial:

- sumar peso si el cambio es `major`
- sumar peso si el paquete está deprecated
- sumar peso si pertenece a `dependencies`
- sumar peso si parece framework/tooling central
- bajar peso si es `devDependency` de bajo impacto

Este score preliminar alimenta tanto la UI como el prompt de `n8n`.

## Feature estrella: Upgrade Plan Inteligente

Este será el principal diferenciador del producto.

### Qué entrega

- agrupación por `waves`
- orden recomendado de ejecución
- justificación por wave
- foco de validación por grupo
- blast radius esperado
- decisión sugerida por paquete:
  - `upgrade now`
  - `upgrade later`
  - `replace`
  - `hold`

### Filosofía

No queremos una lista plana de paquetes. Queremos un plan de ejecución realista:

- Wave 1: low-risk quick wins
- Wave 2: librerías importantes pero manejables
- Wave 3: upgrades mayores y posibles breaking changes
- Wave 4: decisiones estratégicas como reemplazos o migraciones mayores

## Workflows de n8n

`n8n` será responsable de dos workflows principales en el MVP ampliado.

## Workflow 1: `dependency-analysis`

### Objetivo

Orquestar una investigación verificable por paquete y devolver un brief AI útil para developers, no solo un resumen genérico de metadata.

### Trigger

- Webhook llamado por SvelteKit inmediatamente después de crear el análisis

### Input

Payload con:

- `analysisId`
- `projectName`
- stats agregadas
- candidatos normalizados con riesgo preliminar
- `sourceUrls` por dependencia cuando existan

### Pasos propuestos en n8n

1. `Webhook Trigger`
   - recibe el payload base
2. `Code Node: validate input`
   - valida shape mínimo y normaliza tipos
3. `Code Node: normalize candidates`
   - normaliza URLs, `sourceUrls`, fechas y `riskScore`
4. `Code Node: tier packages`
   - incluye siempre `major`
   - incluye siempre `deprecated`
   - completa hasta `top 8` por `riskScore`
5. `Code Node: build shallow briefs`
   - genera briefs deterministas para el resto de dependencias
6. `Split In Batches`
   - procesa `deepCandidates` con concurrencia `3`
7. `Execute Workflow: package-research`
   - llama el subworkflow de investigación profunda por paquete
8. `Code Node: merge package briefs`
   - une `deep` + `shallow`
   - deduplica `sources`
9. `Code Node: prepare executive synthesis`
   - construye el request estructurado al modelo
10. `HTTP Request: Groq executive synthesis`
   - genera `executiveSummaryMd`, `upgradePlan`, `slackDigestMd` y `sources`
11. `Code Node: build completed callback`
   - incorpora `packageBriefs` ya investigados
12. `HTTP Request: callback a SvelteKit`
   - envía resultado firmado
13. `Code Node: build failed callback`
   - construye un payload `failed` si la síntesis final falla

### Reglas del workflow

- limitar el enriquecimiento profundo a paquetes de mayor riesgo para controlar costo y latencia
- priorizar siempre fuentes canónicas antes de abrir fallback web
- no devolver HTML
- devolver solo Markdown estructurado y arrays tipados
- incluir fuentes trazables por paquete cuando existan
- degradar a `partial` o `none` cuando falte evidencia en lugar de inventar breaking changes

### Output esperado

- `executiveSummaryMd`
- `upgradePlan`
- `packageBriefs`
- `slackDigestMd`
- `sources`

## Workflow 1A: `package-research`

### Objetivo

Investigar un paquete crítico con evidencia verificable y devolver un `PackageBrief` con confidence y trazabilidad.

### Trigger

- `Execute Workflow Trigger` llamado por `dependency-analysis`

### Flujo

1. `Execute Workflow Trigger`
2. `Code Node: normalize package context`
   - detecta `repoUrl`, `github.owner`, `github.repo`, `npmUrl`
3. `HTTP Request: npm registry metadata`
   - refresca metadata y deprecation real
4. `IF node: GitHub repo?`
   - evita fetches innecesarios cuando no hay repo GitHub detectable
5. `HTTP Request: GitHub repo metadata`
6. `HTTP Request: GitHub releases`
7. `HTTP Request: GitHub contents/raw`
   - busca `CHANGELOG`, `MIGRATION`, `UPGRADE`, `README`
8. `Code Node: extract evidence window`
   - construye evidencia canónica útil para el rango `currentVersion -> latestVersion`
9. `IF node: canonical evidence enough?`
10. `HTTP Request: Tavily Search`
11. `HTTP Request: Tavily Extract`
   - fallback controlado solo si la evidencia canónica no basta
12. `Code Node: score and dedupe evidence`
   - normaliza labels y confidence
13. `Code Node: prepare package brief prompt`
14. `HTTP Request: Groq package brief`
   - genera el `PackageBrief` estructurado con JSON schema
15. `Code Node: build package brief`
   - aplica fallback seguro si el modelo no devuelve JSON usable
16. `Code Node: return data to parent`

### Output esperado del subworkflow

- `packageBrief`
- `packageBrief.sources`
- `confidence`
- `evidenceStatus`

## Workflow 2: `dependency-radar`

### Objetivo

Convertir el wizard en un sistema útil de seguimiento continuo.

### Trigger

- `Cron` en `n8n`, por ejemplo una o dos veces al día

### Flujo

1. `Cron Trigger`
2. `HTTP Request: fetch subscribed projects`
   - consulta a SvelteKit qué proyectos tienen suscripciones activas
3. `Loop projects`
4. `HTTP Request: start reanalysis`
   - dispara una nueva corrida para el proyecto guardado
5. `Compare node`
   - compara snapshot nuevo vs snapshot anterior
6. `IF node`
   - continuar solo si hay delta relevante
7. `LLM Node: radar digest`
   - resume qué cambió y por qué importa
8. `Slack node`
   - envía mensaje con highlights y deep link al análisis

### Deltas que disparan alerta

- nueva actualización `major`
- paquete marcado como `deprecated`
- aumento relevante del riesgo total
- aparición de paquete que merece `replace`

## Slack como automatización estrella

Slack debe ser la demo de “valor continuo”.

### Qué se enviará

- nombre del proyecto
- cantidad de cambios nuevos
- dependencias críticas afectadas
- resumen corto de impacto
- CTA con enlace a la vista `/analysis/[id]`

### Cuándo se enviará

- cuando `dependency-radar` detecte un delta relevante
- opcionalmente al completar un análisis manual si el canal está suscrito

### Ejemplo de digest

```md
## Package Version Wizard Radar

Project: storefront-web

- 2 nuevas actualizaciones major detectadas
- 1 paquete aparece como deprecated
- Riesgo sugerido: revisar esta semana

Paquetes clave:
- vite: major upgrade con cambios de configuración
- eslint: actualización mayor de tooling
- left-pad-like-lib: marked as deprecated

Ver análisis completo:
https://your-domain/analysis/abc123
```

## Organización recomendada del código

No es necesario implementarla completa en el primer commit, pero esta será la forma objetivo:

- `src/lib/server/package-json/`
  - parsing y normalización
- `src/lib/server/npm/`
  - cliente de npm registry
- `src/lib/server/analysis/`
  - scoring, stats y composición de payloads
- `src/lib/server/db/`
  - acceso a Postgres
- `src/lib/server/n8n/`
  - cliente del webhook y validación del callback
- `src/lib/server/markdown/`
  - transformación y sanitización

## Variables de entorno

### App SvelteKit

Variables mínimas esperadas:

- `DATABASE_URL`
- `N8N_ANALYSIS_WEBHOOK_URL`
- `N8N_ANALYSIS_WEBHOOK_TOKEN`
- `N8N_CALLBACK_SECRET`
- `N8N_INTERNAL_API_TOKEN`
- `APP_BASE_URL`
- `SLACK_WEBHOOK_URL` si alguna automatización también se dispara desde backend

Uso:

- secretos con `$env/static/private` o `$env/dynamic/private`
- URLs públicas con `$env/static/public` o `$env/dynamic/public` solo si realmente deben llegar al cliente

### Secrets y variables en n8n

Los workflows exportados esperan estos valores del lado de `n8n`:

- `APP_CALLBACK_URL`
- `APP_CALLBACK_SECRET`
- `GROQ_API_KEY`
- `GITHUB_TOKEN`
- `TAVILY_API_KEY`

Además:

- el trigger `dependency-analysis` usa `headerAuth` para recibir solo requests firmados desde la app
- el callback a SvelteKit ya no debe tener URL ni secreto hardcodeados en el export

## Deployment en VPS / Dokploy

### App SvelteKit

- build con `bun run build`
- arranque de producción con `node build`
- `adapter-node` como decisión fija

### Servicios esperados

- contenedor o servicio para app SvelteKit
- instancia Postgres
- instancia `n8n`

### Razón de esta elección

- evita patrones estáticos incompatibles con uploads y callbacks
- permite mantener SSR y endpoints internos en el mismo servicio
- encaja bien con Dokploy y recursos generosos de VPS

## MVP ejecutable

El MVP debe incluir exactamente estas capacidades:

- upload de `package.json`
- validación y parseo server-side
- consulta a npm registry
- cálculo de stats y riesgo preliminar
- persistencia en Postgres
- disparo de `n8n` con payload estructurado
- polling de estado en la UI
- vista compartible por `analysisId`
- resumen AI saneado y visible
- upgrade plan por waves
- cards por paquete con foco de testing, evidence status y fuentes

## Roadmap premium

Estas capacidades deben quedar definidas como siguiente fase, no como requisito del primer corte:

- soporte a `package-lock.json`, `bun.lock` y otros lockfiles
- soporte a ZIP de repositorio
- recomendaciones de reemplazo por señales de mantenimiento del paquete
- generación de draft de PR o GitHub Issue
- integración con Jira o GitHub Projects
- radar recurrente configurable por proyecto
- suscripciones Slack gestionables desde UI
- comparación visual entre análisis históricos

## Testing y criterios de aceptación

### Happy path

- un `package.json` válido crea un análisis persistido
- el usuario ve progreso sin recargar manualmente
- el análisis termina y se refleja en la misma sesión
- la URL compartible carga el resultado final correctamente

### Validación

- rechazar archivos no JSON
- rechazar JSON inválido
- rechazar manifiestos sin dependencias
- rechazar uploads demasiado grandes

### Resiliencia

- si `n8n` falla, el análisis termina en `failed` con mensaje visible
- si el callback llega dos veces, el resultado no se duplica
- si el usuario recarga la página durante el proceso, el estado puede recuperarse
- si GitHub o Tavily fallan, el brief puede degradar a `partial` o `none` sin bloquear toda la corrida
- si falta evidencia canónica, el sistema debe seguir generando guidance útil sin inventar hechos verificables

### Calidad del resultado

- el summary no debe ser genérico
- el plan debe separar low-risk vs high-risk
- los paquetes deprecated deben resaltarse explícitamente
- cada paquete crítico debe incluir guidance de test o riesgo
- `breakingChanges` solo deben aparecer cuando exista evidencia suficiente
- cada `packageBrief` debe exponer `confidence`, `evidenceStatus`, `recommendedActions` y fuentes propias
- el resultado debe dejar claro cuándo un paquete quedó en investigación `verified`, `partial` o `none`

### Automatización

- `dependency-radar` solo debe enviar Slack si hay cambios reales
- el mensaje de Slack debe incluir deep link al análisis

## Decisiones explícitas descartadas

Para evitar ambigüedad, estas decisiones quedan fuera por ahora:

- no usar ORM pesado
- no usar Redis ni workers separados
- no introducir auth en el MVP
- no usar SPA pura ni arquitectura fuera de SvelteKit
- no exponer secretos al cliente
- no delegar al LLM la totalidad del análisis técnico

## Why This Will Impress Judges

- Demuestra valor inmediato: subes un `package.json` y recibes algo útil en minutos.
- Demuestra profundidad técnica: no es un chatbot, es un analizador con heurísticas, scoring y priorización real.
- Demuestra AI aplicada con criterio: el modelo agrega contexto y síntesis donde aporta más valor, no donde reemplaza lógica determinista.
- Demuestra visión de producto: el mismo sistema evoluciona naturalmente hacia radar continuo, alertas Slack y automatizaciones para equipos.
- Demuestra viabilidad de hackathon: el MVP es alcanzable con esta arquitectura, pero el roadmap se siente creíble y escalable.
