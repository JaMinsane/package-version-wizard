# AGENTS.md

## Project: Package Version Wizard

Build an impressive SvelteKit web app for a hackathon.

Users upload a `package.json` file.  
The server parses dependencies, checks for newer versions, calls an external n8n workflow for changelog summarization, and presents an AI-generated upgrade brief in a polished UI. But this is not just any app — it should feel like a premium, modern product that wows judges with its polish and utility. The architecture could change in the programming phase, but the core idea is to build a full-stack SvelteKit app with a strong focus on UX, clean code, and quality presentation.

## Default Stack

Use these technologies by default unless the user explicitly asks for alternatives:

- Package manager and local script runner: Bun
- Framework: SvelteKit
- Language: TypeScript
- Styling: Tailwind CSS
- Tailwind plugins: `@tailwindcss/forms`, `@tailwindcss/typography`
- Deployment target: VPS / Dokploy
- Production adapter: `@sveltejs/adapter-node`
- External AI/workflow orchestration: n8n

## Working Style

Act like a senior full-stack engineer helping ship a polished hackathon MVP.

Priorities, in order:

1. End-to-end functionality
2. Clean SSR-friendly architecture
3. Visually impressive UI
4. Clear, maintainable code
5. Speed of execution over overengineering

Prefer complete, copy-pasteable code.
Avoid vague pseudo-code unless explicitly requested.

## Commands

Prefer Bun for local development and package management:

- `bun install`
- `bun add <package>`
- `bun run dev`
- `bun run build`
- `bun run preview`
- `bunx <tool>`

Do not default to npm, pnpm, or yarn.

Exception:
- when discussing or documenting production startup for `@sveltejs/adapter-node`, `node build` is valid and expected.

## SvelteKit Architecture Rules

This is a SvelteKit app powered by Vite.  
Do not suggest replacing the app architecture with raw `Bun.serve()`, standalone Vite SPA patterns, or Bun HTML imports.
Prefer Svelte 5 runes syntax for new Svelte components when stateful/reactive logic is needed. Do not use legacy reactive patterns unless there is a clear reason.
Prefer Svelte 5 snippets for new component composition patterns when they improve clarity. Avoid introducing older slot-based patterns unless needed for compatibility or simplicity.

Prefer SvelteKit conventions:

- routes in `src/routes`
- server form actions in `+page.server.ts`
- endpoints in `+server.ts`
- shared code in `src/lib`
- server-only code in `src/lib/server`

Prefer SSR-friendly patterns and server-side data loading when appropriate.

## Client / Server Boundaries

Keep the client focused on presentation and interaction.

All sensitive or privileged logic must stay on the server, including:

- reading and parsing uploaded files
- calling private n8n webhooks
- attaching API keys or auth headers
- normalizing third-party API responses
- sanitizing and transforming server-returned content

Never expose secrets to the client.

## Forms and UX

Prefer native HTML forms and SvelteKit form actions.

Use progressive enhancement with `use:enhance` where it improves UX.

The upload flow should feel smooth and polished:
- clear CTA
- loading state
- success/error states
- readable results
- hackathon-grade visual quality

## AI Summary Rendering

The app may display an AI-generated summary or release brief.

If the summary arrives as Markdown:
- do not treat Tailwind Typography as a Markdown parser
- first convert Markdown to HTML using a parser such as `marked`
- sanitize the generated HTML before rendering it
- only then render it in Svelte with `{@html ...}`
- style the rendered output with Tailwind Typography, for example `prose prose-slate`

Use `prose` only for content/document sections, not for the entire app shell.

## TypeScript Rules

Prefer strict, explicit types.

- define interfaces/types for uploaded `package.json` data
- define types for dependency analysis results
- define types for n8n responses
- avoid `any` unless absolutely necessary and justified

## Environment Variables

In SvelteKit code, prefer the framework env modules:

- `$env/static/private`
- `$env/dynamic/private`
- `$env/static/public`
- `$env/dynamic/public`

Do not assume environment-variable behavior is identical across dev and production.

## Deployment Rules

This project is intended for deployment to a VPS using Dokploy.

For production deployment, prefer `@sveltejs/adapter-node`.

Do not recommend static-only deployment patterns for this app unless the requirements change, because the app depends on server-side upload handling, external HTTP calls, and AI orchestration.

## Scope Control

This is a hackathon MVP.

Do not introduce the following unless explicitly requested:

- database ORMs
- authentication systems
- complex queue systems
- microservices
- test suites
- unnecessary abstractions
- large design-system setups

Prefer the smallest architecture that delivers a strong live demo.

## UI Direction

Aim for a modern, premium, judge-friendly UI.

Desired feel:
- clean
- technical but approachable
- strong visual hierarchy
- excellent spacing
- meaningful loading and empty states
- impressive AI summary presentation

The “wow” moments should be:
1. smooth package.json upload
2. useful dependency upgrade analysis
3. polished AI-generated summary
4. readable release/changelog presentation

## Anti-Patterns

Do not:
- use React patterns like `useState` or `useEffect`
- move server-only work into client components
- expose raw secrets or internal webhook URLs
- replace SvelteKit routing with ad-hoc custom routing
- overengineer the MVP
- recommend abandoning SvelteKit conventions for generic Node/Bun patterns

## Preferred Output From The Agent

When implementing features:
- explain the plan briefly
- provide file-by-file changes
- prefer complete code blocks
- keep naming consistent
- optimize for speed and clarity

## Implementation Discipline

- Keep files small and focused.
- Prefer descriptive names over clever names.
- Avoid premature abstractions.
- When adding a feature, implement the smallest vertical slice first.
- Favor end-to-end working flows over partially designed architectures.
