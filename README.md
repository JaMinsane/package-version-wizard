# Package Version Wizard

Package Version Wizard es un MVP de hackathon construido con `SvelteKit + Bun + Tailwind + Postgres + n8n`.

Subes un `package.json`, la app:

1. parsea dependencias de forma determinista
2. consulta npm registry
3. calcula riesgo preliminar y prioridades
4. dispara un workflow privado de `n8n`
5. recibe un callback firmado con el brief AI
6. expone el resultado en `/analysis/[id]`

## Stack

- Runtime: Bun
- Framework: SvelteKit
- UI: Tailwind CSS v4
- Persistencia: Postgres vía `Bun.SQL`
- Automatización y AI: n8n

## Variables de entorno

Copia `.env.example` a `.env` y completa:

```bash
DATABASE_URL=
N8N_ANALYSIS_WEBHOOK_URL=
N8N_ANALYSIS_WEBHOOK_TOKEN=
N8N_CALLBACK_SECRET=
PUBLIC_APP_URL=
N8N_INTERNAL_API_TOKEN=
```

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
