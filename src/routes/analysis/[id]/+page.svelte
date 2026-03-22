<script lang="ts">
	import { browser } from '$app/environment';

	import type { PageData } from './$types';

	let { data: initialData }: { data: PageData } = $props();

	function getInitialAnalysis() {
		return structuredClone(initialData.analysis);
	}

	let activeAnalysis = $state(getInitialAnalysis());
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
		completed: 'La corrida volvió desde n8n y quedó persistida en Postgres.',
		failed: 'La integración respondió con error o el callback no pasó la validación.'
	} as const;

	$effect(() => {
		if (
			!browser ||
			activeAnalysis.status === 'completed' ||
			activeAnalysis.status === 'failed'
		) {
			isPolling = false;
			return;
		}

		const analysisId = activeAnalysis.id;
		let cancelled = false;
		let intervalId = 0;

		const refreshAnalysis = async () => {
			try {
				const response = await fetch(`/api/analyses/${analysisId}`);

				if (!response.ok) {
					const payload = (await response.json().catch(() => null)) as { message?: string } | null;
					throw new Error(payload?.message ?? 'No se pudo consultar el estado del análisis.');
				}

				const nextAnalysis = (await response.json()) as PageData['analysis'];

				if (cancelled) {
					return;
				}

				activeAnalysis = nextAnalysis;
				pollingError = null;

				if (nextAnalysis.status === 'completed' || nextAnalysis.status === 'failed') {
					clearInterval(intervalId);
					isPolling = false;
				}
			} catch (error) {
				if (cancelled) {
					return;
				}

				pollingError =
					error instanceof Error ? error.message : 'Ocurrió un error consultando el análisis.';
				clearInterval(intervalId);
				isPolling = false;
			}
		};

		isPolling = true;
		pollingError = null;
		void refreshAnalysis();
		intervalId = window.setInterval(() => {
			void refreshAnalysis();
		}, 2200);

		return () => {
			cancelled = true;
			clearInterval(intervalId);
			isPolling = false;
		};
	});

	const requestJson = $derived(JSON.stringify(activeAnalysis.requestPayload, null, 2));
	const callbackJson = $derived(
		activeAnalysis.callbackPayload ? JSON.stringify(activeAnalysis.callbackPayload, null, 2) : ''
	);

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
	<title>{activeAnalysis.project.name} | Analysis</title>
	<meta
		name="description"
		content="Vista persistida de un análisis de Package Version Wizard con polling y callback desde n8n."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<section class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<a
						href="/"
						class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:bg-white"
					>
						Volver al landing
					</a>
					<p class="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
						Análisis persistido
					</p>
					<h1 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
						{activeAnalysis.project.name}
					</h1>
					<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
						Este análisis vive en Postgres, recibe callbacks idempotentes desde n8n y expone una
						API de polling en `/api/analyses/[id]`.
					</p>
				</div>

				<span
					class={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(activeAnalysis.status)}`}
				>
					{statusLabels[activeAnalysis.status]}
				</span>
			</div>
		</section>

		<section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
			<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
							Estado actual
						</p>
						<h2 class="mt-2 text-2xl font-bold text-slate-950">Corrida persistida</h2>
					</div>
					<span
						class={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(activeAnalysis.status)}`}
					>
						{statusLabels[activeAnalysis.status]}
					</span>
				</div>

				<div class="mt-6 space-y-4">
					<div class="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Run ID</p>
						<p class="mt-2 break-all font-mono text-sm text-slate-800">{activeAnalysis.id}</p>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
								Creado
							</p>
							<p class="mt-2 text-sm text-slate-800">{formatTimestamp(activeAnalysis.createdAt)}</p>
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
								Callback
							</p>
							<p class="mt-2 text-sm text-slate-800">
								{formatTimestamp(activeAnalysis.callbackReceivedAt)}
							</p>
						</div>
					</div>

					<div class="rounded-3xl border border-slate-200 bg-white p-5">
						<p class="text-sm font-semibold text-slate-950">
							{statusDescriptions[activeAnalysis.status]}
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

						{#if activeAnalysis.errorMessage}
							<div class="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
								{activeAnalysis.errorMessage}
							</div>
						{/if}
					</div>

					<div class="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dispatch</p>
						<div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
							<div>
								<p class="text-slate-400">Status HTTP del webhook</p>
								<p class="mt-1 font-semibold text-white">
									{activeAnalysis.webhookResponse?.status ?? 'Pendiente'}
								</p>
							</div>
							<div>
								<p class="text-slate-400">Idempotency key</p>
								<p class="mt-1 break-all font-mono text-xs text-slate-200">
									{activeAnalysis.lastIdempotencyKey ?? 'Aún no llegó callback'}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="space-y-6">
				<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
								Resultado renderizado
							</p>
							<h2 class="mt-2 text-2xl font-bold text-slate-950">Brief de upgrade demo</h2>
						</div>
						{#if activeAnalysis.status === 'completed'}
							<span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
								Listo para revisar
							</span>
						{/if}
					</div>

					{#if activeAnalysis.status === 'completed' && activeAnalysis.renderedSummaryHtml}
						<div class="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
							<div class="prose prose-slate max-w-none prose-headings:font-bold prose-p:text-slate-700">
								{@html activeAnalysis.renderedSummaryHtml}
							</div>
						</div>

						{#if activeAnalysis.callbackPayload?.upgradePlan.length}
							<div class="mt-6 grid gap-4 lg:grid-cols-2">
								{#each activeAnalysis.callbackPayload.upgradePlan as phase}
									<article class="rounded-3xl border border-slate-200 bg-white p-5">
										<div class="flex items-start justify-between gap-3">
											<div>
												<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
													Fase {phase.wave}
												</p>
												<h3 class="mt-2 text-lg font-semibold text-slate-950">{phase.title}</h3>
											</div>
										</div>
										<p class="mt-3 text-sm leading-6 text-slate-600">{phase.rationale}</p>
										<div class="mt-4 flex flex-wrap gap-2">
											{#each phase.packages as packageName}
												<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
													{packageName}
												</span>
											{/each}
										</div>
									</article>
								{/each}
							</div>
						{/if}

						{#if activeAnalysis.callbackPayload?.packageBriefs.length}
							<div class="mt-6 grid gap-4 xl:grid-cols-2">
								{#each activeAnalysis.callbackPayload.packageBriefs as brief}
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

						{#if activeAnalysis.callbackPayload?.sources.length}
							<div class="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
								<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fuentes</p>
								<div class="mt-4 grid gap-3">
									{#each activeAnalysis.callbackPayload.sources as source}
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
					{:else if activeAnalysis.status === 'sending' || activeAnalysis.status === 'waiting_callback'}
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

				<details class="group rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
					<summary class="flex cursor-pointer list-none items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
								Panel técnico
							</p>
							<h2 class="mt-2 text-2xl font-bold text-slate-950">Request y callback crudos</h2>
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
			</div>
		</section>
	</div>
</div>
