<script lang="ts">
	import { enhance } from '$app/forms';

	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const demoReady = $derived(
		data.environmentReady.databaseConfigured &&
			data.environmentReady.webhookConfigured &&
			data.environmentReady.callbackConfigured
	);
</script>

<svelte:head>
	<title>Package Version Wizard | Demo persistida</title>
	<meta
		name="description"
		content="Landing demo con Postgres persistido para validar el roundtrip completo entre SvelteKit y n8n."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
			<div class="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/85 p-8 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
				<div class="flex flex-wrap items-center gap-3">
					<span
						class="rounded-full border border-slate-300/80 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-50"
					>
						Package Version Wizard
					</span>
					<span
						class="rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900"
					>
						Demo de integración con n8n
					</span>
				</div>

				<div class="mt-8 max-w-3xl space-y-5">
					<h1 class="max-w-2xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
						Prueba el roundtrip persistido entre SvelteKit, Postgres y tu workflow de n8n.
					</h1>
					<p class="max-w-2xl text-lg leading-8 text-slate-600">
						Esta landing sigue siendo demo-first, pero ahora cada corrida vive en Postgres, se
						expone en una URL estable y queda lista para evolucionar a historial, uploads reales
						y automatizaciones.
					</p>
				</div>

				<div class="mt-8 grid gap-4 sm:grid-cols-3">
					<div class="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">1. Trigger</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							La app construye el payload demo, crea el análisis y sus dependencias en Postgres,
							y luego dispara el webhook privado de n8n.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">2. Espera</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							La UI redirige a una URL persistida del análisis y hace polling contra la API real
							hasta que llegue el callback.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">3. Brief</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							El callback firmado se valida, se deduplica y queda guardado como un brief premium
							recuperable en `/analysis/[id]`.
						</p>
					</div>
				</div>

				<div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
					<form method="POST" action="?/runDemo" use:enhance>
						<button
							type="submit"
							class="inline-flex items-center gap-3 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
							disabled={!demoReady}
						>
							<span class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
							Probar flujo con n8n
						</button>
					</form>

					<p class="max-w-xl text-sm leading-6 text-slate-500">
						El payload demo incluye upgrades mixtos, un paquete deprecated y suficiente contexto
						para que n8n devuelva un brief interesante y quede persistido como análisis.
					</p>
				</div>

				{#if form?.message}
					<div class="mt-6 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
						{form.message}
					</div>
				{/if}

				{#if !demoReady}
					<div class="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
						Configura las variables privadas y la conexión a Postgres antes de probar el
						roundtrip completo.
					</div>
				{/if}
			</div>

			<div class="grid gap-6">
				<div class="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
								Readiness
							</p>
							<h2 class="mt-2 text-2xl font-bold text-slate-950">Estado de la integración</h2>
						</div>
						<div class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
							Single-node demo
						</div>
					</div>

					<div class="mt-6 space-y-3">
						<div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
							<div>
								<p class="text-sm font-semibold text-slate-900">Postgres persistido</p>
								<p class="text-xs text-slate-500">`DATABASE_URL`</p>
							</div>
							<span
								class={`rounded-full px-3 py-1 text-xs font-semibold ${
									data.environmentReady.databaseConfigured
										? 'bg-emerald-100 text-emerald-900'
										: 'bg-rose-100 text-rose-900'
								}`}
							>
								{data.environmentReady.databaseConfigured ? 'Listo' : 'Falta'}
							</span>
						</div>

						<div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
							<div>
								<p class="text-sm font-semibold text-slate-900">Webhook privado de n8n</p>
								<p class="text-xs text-slate-500">`N8N_ANALYSIS_WEBHOOK_URL` + token</p>
							</div>
							<span
								class={`rounded-full px-3 py-1 text-xs font-semibold ${
									data.environmentReady.webhookConfigured
										? 'bg-emerald-100 text-emerald-900'
										: 'bg-rose-100 text-rose-900'
								}`}
							>
								{data.environmentReady.webhookConfigured ? 'Listo' : 'Falta'}
							</span>
						</div>

						<div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
							<div>
								<p class="text-sm font-semibold text-slate-900">Validación del callback</p>
								<p class="text-xs text-slate-500">`N8N_CALLBACK_SECRET`</p>
							</div>
							<span
								class={`rounded-full px-3 py-1 text-xs font-semibold ${
									data.environmentReady.callbackConfigured
										? 'bg-emerald-100 text-emerald-900'
										: 'bg-rose-100 text-rose-900'
								}`}
							>
								{data.environmentReady.callbackConfigured ? 'Listo' : 'Falta'}
							</span>
						</div>
					</div>
				</div>

				<div class="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(254,249,195,0.85))] p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Callback fijo</p>
					<p class="mt-3 text-lg font-semibold text-slate-950">
						https://hackaton.jamesjh.top/api/internal/n8n/callback
					</p>
					<p class="mt-3 text-sm leading-6 text-slate-600">
						n8n ya puede llamar este endpoint. La app valida `x-n8n-signature`, registra
						`x-idempotency-key`, deduplica retries y persiste el resultado del callback en Postgres.
					</p>
				</div>
			</div>
		</section>

		<section class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
			<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Persistencia real</p>
				<h2 class="mt-2 text-2xl font-bold text-slate-950">Qué queda guardado</h2>
				<div class="mt-6 grid gap-4 sm:grid-cols-2">
					<div class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
						<p class="text-sm font-semibold text-slate-950">Proyecto</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Slug lógico reutilizable para que esta demo pueda crecer a historial y rechecks.
						</p>
					</div>
					<div class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
						<p class="text-sm font-semibold text-slate-950">Análisis</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Estado, payload enviado, callback crudo, brief renderizado y timestamps terminales.
						</p>
					</div>
					<div class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
						<p class="text-sm font-semibold text-slate-950">Dependencias</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Snapshot normalizado por análisis para que luego puedas comparar corridas.
						</p>
					</div>
					<div class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
						<p class="text-sm font-semibold text-slate-950">Receipts de callback</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Idempotency keys persistidas para que retries de n8n no reescriban el análisis.
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(224,242,254,0.92))] p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ruta final</p>
				<p class="mt-3 text-lg font-semibold text-slate-950">/analysis/[id]</p>
				<p class="mt-3 text-sm leading-6 text-slate-600">
					Después del trigger, la app redirige a una URL estable del análisis. Desde ahí verás el
					polling corto, el callback firmado y el brief renderizado, todo leyendo desde Postgres.
				</p>

				<div class="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-5">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
						Stack de esta slice
					</p>
					<p class="mt-3 text-sm leading-6 text-slate-700">
						SvelteKit SSR + Bun SQL nativo + Postgres + webhook privado a n8n + callback
						idempotente.
					</p>
				</div>
			</div>
		</section>
	</div>
</div>
