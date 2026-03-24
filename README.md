# Package Version Wizard

Package Version Wizard es un MVP de hackathon construido con `SvelteKit + Bun + Tailwind + Postgres + n8n`.

Subes un `package.json`, la app:

1. parsea dependencias de forma determinista
2. consulta npm registry
3. calcula riesgo preliminar y prioridades
4. dispara un workflow orquestador de `n8n`
5. investiga en profundidad los paquetes más críticos con fuentes canónicas y fallback web controlado
6. recibe un callback firmado con el brief AI enriquecido
7. expone el resultado en `/analysis/[id]`

## Cómo fluye el análisis

- La app calcula un ranking preliminar y dispara el workflow orquestador `dependency-analysis`.
- El orquestador separa quick wins, high risk y paquetes `deprecated`.
- Los paquetes más sensibles pasan por el subworkflow `package-research`.
- `package-research` funciona como extractor estricto: prioriza fuentes canónicas, usa fallback web controlado y produce un `packageBrief` por paquete.
- `dependency-analysis` funciona como sintetizador: consolida los `packageBriefs`, construye el plan por fases y envía el callback final a la app.
- La app persiste el callback firmado, renderiza Markdown seguro y deja trazabilidad visible por paquete y a nivel global.

## Stack

- Runtime: Bun
- Framework: SvelteKit
- UI: Tailwind CSS v4
- Persistencia: Postgres vía `Bun.SQL`
- Automatización y AI: n8n

## Variables de entorno de la app

Copia `.env.example` a `.env` y completa:

```bash
DATABASE_URL=
N8N_ANALYSIS_WEBHOOK_URL=
N8N_ANALYSIS_WEBHOOK_TOKEN=
N8N_CALLBACK_SECRET=
APP_BASE_URL=
N8N_INTERNAL_API_TOKEN=
```

## Variables y secretos esperados en `n8n`

Los workflows exportados en [`n8n/dependency-analysis.json`](./n8n/dependency-analysis.json) y
[`n8n/package-research.json`](./n8n/package-research.json) esperan estos valores:

```bash
APP_CALLBACK_URL=
APP_CALLBACK_SECRET=
GROQ_API_KEY=
GITHUB_TOKEN=
TAVILY_API_KEY=
```

Además, el webhook `dependency-analysis` sigue esperando auth por header en la credencial
`httpHeaderAuth` configurada dentro de `n8n`.

## Reglas de trazabilidad y seguridad del brief

- `package-research` y `dependency-analysis` usan `Basic LLM Chain` con `Structured Output Parser`.
- Ambos workflows operan con prompts conservadores: el subworkflow extrae evidencia y el parent sintetiza, no reinvestiga.
- `sources` usa whitelist estricta:
  - en el subworkflow solo sobreviven URLs presentes en la evidencia recopilada
  - en el workflow padre solo sobreviven URLs ya aprobadas en la consolidación previa
- Esto evita que el modelo introduzca URLs nuevas aunque tengan formato válido.
- Si el LLM del parent falla pero ya existen `packageBriefs`, el workflow devuelve una síntesis degradada con estado `completed` y mantiene las fuentes reales.
- El callback final hacia la app usa timeout y retries para reducir pérdidas de resultados por fallos transitorios de red.

## Desarrollo

```bash
bun install
bun run dev
```

## Base de datos

```bash
bun run db:ping
bun run db:migrate
```

La documentación técnica del esquema está en [`BD.md`](./BD.md).

## Producción

```bash
bun run build
bun run start
```

El contenedor también puede ejecutar migraciones al arrancar según el `entrypoint`.

## Rutas principales

- `/` upload wizard
- `/analysis/[id]` vista compartible del resultado
- `/api/analyses/[id]` polling del estado
- `/api/internal/n8n/callback` callback firmado desde n8n
- `/api/internal/radar/subscriptions` feed interno para radar continuo
- `/api/internal/radar/reanalyze` reanálisis interno por proyecto

## Workflows incluidos

- `n8n/dependency-analysis.json`: orquestador principal, consolidación, síntesis ejecutiva y callback firmado
- `n8n/package-research.json`: subworkflow de investigación por paquete con extracción estricta de evidencia
