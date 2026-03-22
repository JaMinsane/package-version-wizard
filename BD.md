# Base de Datos

## Objetivo

La app deja de depender de memoria local y pasa a usar Postgres como fuente de verdad para:

- corridas persistidas de análisis
- historial por proyecto
- deduplicación de callbacks de n8n
- crecimiento futuro hacia uploads reales, rechecks y automatizaciones

La integración usa `Bun.SQL` nativo. No hay ORM.
Como la capa de datos depende de `Bun.SQL`, el runtime de producción debe ejecutarse con Bun.

## Arquitectura

### Capa de acceso

- `src/lib/server/db/client.ts`: singleton de `Bun.SQL` para la app
- `src/lib/server/db/migrate.ts`: runner de migraciones con tabla `schema_migrations`
- `src/lib/server/analysis/repository.ts`: queries y mapeo entre Postgres y tipos de dominio
- `src/lib/server/analysis/service.ts`: orquestación de demo, dispatch a n8n y callback

### Estrategia de migraciones

- Las migraciones viven en `src/lib/server/db/migrations`
- `bun run db:migrate` crea `schema_migrations` si no existe
- Cada archivo `.sql` se aplica una sola vez, en orden lexicográfico
- Cada migración se ejecuta dentro de transacción

## Modelo relacional

### `projects`

Representa una identidad lógica reutilizable del proyecto.

- `id`: PK textual generada en la app
- `slug`: clave única estable
- `name`: nombre visible del proyecto
- `ecosystem`: hoy fijo en `npm`

### `analyses`

Snapshot completo de una corrida.

- `id`: PK textual, igual al `analysisId`
- `project_id`: FK a `projects`
- `status`: `sending | waiting_callback | completed | failed`
- `request_payload_json`: payload enviado a n8n
- `callback_payload_json`: payload recibido desde n8n
- `summary_markdown` / `summary_html`: artefactos renderizables
- `upgrade_plan_json`, `package_briefs_json`, `sources_json`: bloques estructurados para UI
- `webhook_response_json`: respuesta inicial de aceptación del webhook
- `error_message`: fallo terminal si aplica
- `last_idempotency_key`: último callback aplicado

### `analysis_dependencies`

Snapshot normalizado de dependencias por análisis.

- una fila por paquete y grupo
- guarda versiones, tipo de diff, `deprecated`, score y metadata básica

### `automation_subscriptions`

Esquema listo para alertas y rechecks futuros. No tiene UI todavía.

### `analysis_callback_receipts`

Soporte de idempotencia del callback.

- un `idempotency_key` se aplica una sola vez
- guarda `payload_hash` para trazabilidad

## Reglas operativas

### Estados

- `sending`: análisis creado antes del dispatch a n8n
- `waiting_callback`: n8n aceptó el webhook
- `completed`: callback exitoso y persistido
- `failed`: fallo de dispatch o callback fallido

### Timestamps

- `created_at`: creación del registro
- `updated_at`: última mutación
- `completed_at`: momento terminal del análisis
- `received_at`: llegada del callback deduplicado

### Idempotencia

- El callback exige `x-idempotency-key`
- Se inserta primero en `analysis_callback_receipts`
- Si la key ya existe, el callback se trata como duplicado
- Si el análisis ya está en estado terminal, no se reaplica aunque llegue otra key

## Diagramas

### ERD

```mermaid
erDiagram
    projects ||--o{ analyses : has
    analyses ||--o{ analysis_dependencies : snapshots
    projects ||--o{ automation_subscriptions : subscribes
    analyses ||--o{ analysis_callback_receipts : receives

    projects {
        text id PK
        text slug UK
        text name
        text ecosystem
        timestamptz created_at
        timestamptz updated_at
    }

    analyses {
        text id PK
        text project_id FK
        text status
        jsonb stats_json
        jsonb request_payload_json
        jsonb callback_payload_json
        text summary_markdown
        text summary_html
        jsonb upgrade_plan_json
        jsonb package_briefs_json
        jsonb sources_json
        text slack_digest_markdown
        jsonb webhook_response_json
        text error_message
        text n8n_execution_id
        text last_idempotency_key
        timestamptz created_at
        timestamptz updated_at
        timestamptz completed_at
    }

    analysis_dependencies {
        bigint id PK
        text analysis_id FK
        text name
        text dependency_group
        text current_version
        text latest_version
        text diff_type
        boolean deprecated
        timestamptz published_at
        text repository_url
        integer risk_score
        text decision
        jsonb source_urls_json
    }

    automation_subscriptions {
        bigint id PK
        text project_id FK
        text channel_type
        text channel_target
        boolean enabled
        text frequency
        timestamptz last_sent_at
        timestamptz created_at
        timestamptz updated_at
    }

    analysis_callback_receipts {
        bigint id PK
        text analysis_id FK
        text idempotency_key UK
        timestamptz received_at
        text payload_hash
    }
```

### Flujo de datos

```mermaid
sequenceDiagram
    participant U as Usuario
    participant W as Landing SvelteKit
    participant A as Action runDemo
    participant DB as Postgres
    participant N as n8n
    participant C as Callback interno
    participant P as Polling /api/analyses/[id]

    U->>W: Click en "Probar flujo con n8n"
    W->>A: POST form action
    A->>DB: upsert project + create analysis + insert dependencies
    A->>N: POST webhook privado
    N-->>A: 202 accepted
    A->>DB: update analysis -> waiting_callback
    A-->>W: redirect /analysis/[id]
    W->>P: GET /api/analyses/[id]
    P->>DB: read analysis snapshot
    DB-->>P: status waiting_callback
    N->>C: POST /api/internal/n8n/callback
    C->>DB: validate analysis + insert receipt + persist artifacts
    DB-->>C: committed
    W->>P: polling corto
    P->>DB: read completed analysis
    DB-->>P: completed + summary
    P-->>W: snapshot final
```

## Comandos

```bash
bun run db:ping
bun run db:migrate
bun run start
```

Ambos comandos esperan `DATABASE_URL` en el entorno.
