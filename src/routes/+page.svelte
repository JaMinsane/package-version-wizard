<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type ActiveRun = NonNullable<PageData['activeRun']>;

	let activeRun = $state<PageData['activeRun']>(null);
	let isPolling = $state(false);
	let pollingError = $state<string | null>(null);

	const statusLabels = {
		sending: 'Enviando payload a n8n',
		waiting_callback: 'Esperando callback firmado',
		completed: 'Roundtrip completado',
		failed: 'La corrida falló'
	} as const;

	const statusDescriptions = {
		sending: 'Generando el payload demo y disparando el webhook privado.',
		waiting_callback: 'n8n aceptó la corrida; la app está esperando el callback interno.',
		completed: 'La demo volvió desde n8n y ya está renderizada en esta pantalla.',
		failed: 'La integración respondió con error o el callback no pasó la validación.'
	} as const;

	$effect(() => {
		activeRun = data.activeRun;
	});

	$effect(() => {
		if (!browser || !activeRun || activeRun.status === 'completed' || activeRun.status === 'failed') {
			isPolling = false;
			return;
		}

		const runId = activeRun.id;
		let cancelled = false;
		let intervalId = 0;

		const refreshRun = async () => {
			try {
				const response = await fetch(`/api/demo-runs/${runId}`);

				if (!response.ok) {
					const payload = (await response.json().catch(() => null)) as { message?: string } | null;
					throw new Error(payload?.message ?? 'No se pudo consultar el estado de la corrida.');
				}

				const nextRun = (await response.json()) as ActiveRun;

				if (cancelled) {
					return;
				}

				activeRun = nextRun;
				pollingError = null;

				if (nextRun.status === 'completed' || nextRun.status === 'failed') {
					clearInterval(intervalId);
					isPolling = false;
				}
			} catch (error) {
				if (cancelled) {
					return;
				}

				pollingError =
					error instanceof Error ? error.message : 'Ocurrió un error consultando la corrida.';
				clearInterval(intervalId);
				isPolling = false;
			}
		};

		isPolling = true;
		pollingError = null;
		void refreshRun();
		intervalId = window.setInterval(() => {
			void refreshRun();
		}, 2200);

		return () => {
			cancelled = true;
			clearInterval(intervalId);
			isPolling = false;
		};
	});

	const demoReady = $derived(
		data.environmentReady.webhookConfigured && data.environmentReady.callbackConfigured
	);

	const requestJson = $derived(activeRun ? JSON.stringify(activeRun.requestPayload, null, 2) : '');
	const callbackJson = $derived(activeRun?.callbackPayload ? JSON.stringify(activeRun.callbackPayload, null, 2) : '');

	function formatTimestamp(value?: string) {
		if (!value) return 'Pendiente';

		return new Intl.DateTimeFormat('es-CO', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function getStatusTone(status: keyof typeof statusLabels) {
		return {
			sending: 'border-amber-300/70 bg-amber-100/80 text-amber-900',
			waiting_callback: 'border-cyan-300/70 bg-cyan-100/80 text-cyan-900',
			completed: 'border-emerald-300/70 bg-emerald-100/80 text-emerald-900',
			failed: 'border-rose-300/70 bg-rose-100/80 text-rose-900'
		}[status];
	}
</script>

<svelte:head>
	<title>Package Version Wizard | Demo n8n</title>
	<meta
		name="description"
		content="Landing demo para validar el roundtrip completo entre SvelteKit y n8n."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;700;800&display=swap"
		rel="stylesheet"
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
						Prueba el roundtrip completo entre SvelteKit y tu workflow de n8n.
					</h1>
					<p class="max-w-2xl text-lg leading-8 text-slate-600">
						Esta landing no sube archivos todavía. Dispara una corrida demo curada, espera el
						callback firmado de n8n y renderiza el resultado como si ya fuera un brief premium
						para el jurado.
					</p>
				</div>

				<div class="mt-8 grid gap-4 sm:grid-cols-3">
					<div class="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">1. Trigger</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							La app construye un payload fijo y lo manda a tu webhook privado de n8n.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">2. Espera</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							La UI entra en estado de progreso y consulta en corto hasta recibir el callback.
						</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">3. Brief</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							El callback se valida en servidor y el resumen vuelve renderizado en la misma vista.
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
						para que n8n devuelva un resumen interesante.
					</p>
				</div>

				{#if !demoReady}
					<div class="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
						Configura las variables privadas antes de probar el roundtrip completo.
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
						`x-idempotency-key` y conserva el último resultado en memoria para esta demo.
					</p>
				</div>
			</div>
		</section>

		<section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
			<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
							Estado actual
						</p>
						<h2 class="mt-2 text-2xl font-bold text-slate-950">Corrida demo</h2>
					</div>
					{#if activeRun}
						<span
							class={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(activeRun.status)}`}
						>
							{statusLabels[activeRun.status]}
						</span>
					{/if}
				</div>

				{#if activeRun}
					<div class="mt-6 space-y-4">
						<div class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
							<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Run ID</p>
							<p class="mt-2 break-all font-mono text-sm text-slate-800">{activeRun.id}</p>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
								<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
									Creado
								</p>
								<p class="mt-2 text-sm text-slate-800">{formatTimestamp(activeRun.createdAt)}</p>
							</div>
							<div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
								<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
									Callback
								</p>
								<p class="mt-2 text-sm text-slate-800">
									{formatTimestamp(activeRun.callbackReceivedAt)}
								</p>
							</div>
						</div>

						<div class="rounded-3xl border border-slate-200 bg-white p-5">
							<p class="text-sm font-semibold text-slate-950">
								{statusDescriptions[activeRun.status]}
							</p>

							{#if isPolling}
								<div class="mt-4 flex items-center gap-3 text-sm text-slate-500">
									<span class="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-500"></span>
									La página sigue consultando el estado automáticamente.
								</div>
							{/if}

							{#if pollingError}
								<div class="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
									{pollingError}
								</div>
							{/if}

							{#if activeRun.errorMessage}
								<div class="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
									{activeRun.errorMessage}
								</div>
							{/if}
						</div>

						<div class="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50">
							<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
								Dispatch
							</p>
							<div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
								<div>
									<p class="text-slate-400">Status HTTP al webhook</p>
									<p class="mt-1 font-semibold text-white">
										{activeRun.webhookResponse?.status ?? 'Pendiente'}
									</p>
								</div>
								<div>
									<p class="text-slate-400">Idempotency key</p>
									<p class="mt-1 break-all font-mono text-xs text-slate-200">
										{activeRun.lastIdempotencyKey ?? 'Aún no llegó callback'}
									</p>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<div class="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center">
						<p class="text-lg font-semibold text-slate-900">Todavía no hay una corrida activa</p>
						<p class="mt-2 text-sm leading-6 text-slate-500">
							Lanza la demo desde arriba y esta columna mostrará el viaje completo hacia n8n.
						</p>
					</div>
				{/if}
			</div>

			<div class="space-y-6">
				<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
								Resultado renderizado
							</p>
							<h2 class="mt-2 text-2xl font-bold text-slate-950">Upgrade brief demo</h2>
						</div>
						{#if activeRun?.status === 'completed'}
							<span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
								Listo para revisar
							</span>
						{/if}
					</div>

					{#if activeRun?.status === 'completed' && activeRun.renderedSummaryHtml}
						<div class="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
							<div class="prose prose-slate max-w-none prose-headings:font-bold prose-p:text-slate-700">
								{@html activeRun.renderedSummaryHtml}
							</div>
						</div>

						{#if activeRun.callbackPayload?.upgradePlan.length}
							<div class="mt-6 grid gap-4 lg:grid-cols-2">
								{#each activeRun.callbackPayload.upgradePlan as wave}
									<article class="rounded-3xl border border-slate-200 bg-white p-5">
										<div class="flex items-start justify-between gap-3">
											<div>
												<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
													Wave {wave.wave}
												</p>
												<h3 class="mt-2 text-lg font-semibold text-slate-950">{wave.title}</h3>
											</div>
										</div>
										<p class="mt-3 text-sm leading-6 text-slate-600">{wave.rationale}</p>
										<div class="mt-4 flex flex-wrap gap-2">
											{#each wave.packages as packageName}
												<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
													{packageName}
												</span>
											{/each}
										</div>
									</article>
								{/each}
							</div>
						{/if}

						{#if activeRun.callbackPayload?.packageBriefs.length}
							<div class="mt-6 grid gap-4 xl:grid-cols-2">
								{#each activeRun.callbackPayload.packageBriefs as brief}
									<article class="rounded-3xl border border-slate-200 bg-white p-5">
										<h3 class="text-lg font-semibold text-slate-950">{brief.name}</h3>
										<p class="mt-3 text-sm leading-6 text-slate-600">{brief.summary}</p>

										{#if brief.breakingChanges.length}
											<div class="mt-5">
												<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
													Breaking changes
												</p>
												<ul class="mt-2 space-y-2 text-sm text-slate-700">
													{#each brief.breakingChanges as change}
														<li class="rounded-2xl bg-rose-50 px-3 py-2">{change}</li>
													{/each}
												</ul>
											</div>
										{/if}

										{#if brief.testFocus.length}
											<div class="mt-5">
												<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
													Test focus
												</p>
												<div class="mt-2 flex flex-wrap gap-2">
													{#each brief.testFocus as focus}
														<span class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-900">
															{focus}
														</span>
													{/each}
												</div>
											</div>
										{/if}
									</article>
								{/each}
							</div>
						{/if}

						{#if activeRun.callbackPayload?.sources.length}
							<div class="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
								<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fuentes</p>
								<div class="mt-4 grid gap-3">
									{#each activeRun.callbackPayload.sources as source}
										<a
											class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white"
											href={source.url}
											target="_blank"
											rel="noreferrer"
										>
											<span>
												<span class="font-semibold text-slate-900">{source.packageName}</span>
												<span class="ml-2 text-slate-500">{source.label}</span>
											</span>
											<span class="font-mono text-xs text-slate-500">open</span>
										</a>
									{/each}
								</div>
							</div>
						{/if}
					{:else if activeRun && (activeRun.status === 'sending' || activeRun.status === 'waiting_callback')}
						<div class="mt-6 grid gap-4">
							<div class="animate-pulse rounded-3xl border border-slate-200 bg-slate-50/90 p-6">
								<div class="h-4 w-28 rounded-full bg-slate-200"></div>
								<div class="mt-4 h-5 w-5/6 rounded-full bg-slate-200"></div>
								<div class="mt-3 h-5 w-4/6 rounded-full bg-slate-200"></div>
								<div class="mt-6 grid gap-3 sm:grid-cols-2">
									<div class="h-28 rounded-2xl bg-white"></div>
									<div class="h-28 rounded-2xl bg-white"></div>
								</div>
							</div>
						</div>
					{:else}
						<div class="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center">
							<p class="text-lg font-semibold text-slate-900">Aquí aparecerá el resultado del callback</p>
							<p class="mt-2 text-sm leading-6 text-slate-500">
								Cuando n8n responda, esta sección mostrará el resumen, el plan y los paquetes clave.
							</p>
						</div>
					{/if}
				</div>

				{#if activeRun}
					<details class="group rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
						<summary class="flex cursor-pointer list-none items-center justify-between gap-3">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
									Panel técnico
								</p>
								<h2 class="mt-2 text-2xl font-bold text-slate-950">
									Request y callback crudos
								</h2>
							</div>
							<span class="text-sm font-medium text-slate-500 transition group-open:rotate-45">+</span>
						</summary>

						<div class="mt-6 grid gap-4 xl:grid-cols-2">
							<div class="rounded-3xl border border-slate-200 bg-slate-950 p-4">
								<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
									Payload enviado
								</p>
								<pre class="mt-3 overflow-x-auto font-mono text-xs leading-6 text-slate-100">{requestJson}</pre>
							</div>

							<div class="rounded-3xl border border-slate-200 bg-slate-950 p-4">
								<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
									Callback recibido
								</p>
								<pre class="mt-3 overflow-x-auto font-mono text-xs leading-6 text-slate-100">{callbackJson || 'Pendiente'}</pre>
							</div>
						</div>
					</details>
				{/if}
			</div>
		</section>
	</div>
</div>
