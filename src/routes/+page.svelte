<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSubmitting = $state(false);
	let selectedFileName = $state('');
	let subscribeSlack = $state(false);
	let slackChannelTarget = $state('');
	let slackFrequency = $state('daily');

	const analysisReady = $derived(
		data.environmentReady.databaseConfigured &&
			data.environmentReady.webhookConfigured &&
			data.environmentReady.callbackConfigured
	);

	$effect(() => {
		subscribeSlack = Boolean(form?.values?.subscribeSlack);
		slackChannelTarget = form?.values?.slackChannelTarget ?? '';
		slackFrequency = form?.values?.slackFrequency ?? 'daily';
	});

	const enhanceUpload: SubmitFunction = () => {
		isSubmitting = true;

		return async ({ update }) => {
			await update();
			isSubmitting = false;
		};
	};

	function handleFileSelection(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		selectedFileName = input.files?.[0]?.name ?? '';
	}

	function readinessTone(ready: boolean) {
		return ready ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900';
	}
</script>

<svelte:head>
	<title>Package Version Wizard | Copilot de upgrades para npm</title>
	<meta
		name="description"
		content="Sube tu package.json y recibe un plan de upgrade priorizado, con riesgo, fases de ejecución y automatización continua con n8n."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-8">
		<section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<div class="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/85 p-8 shadow-[0_32px_100px_-40px_rgba(15,23,42,0.32)] backdrop-blur">
				<div class="flex flex-wrap items-center gap-3">
					<span class="rounded-full border border-slate-200 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-50">
						Package Version Wizard
					</span>
					<span class="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900">
						SvelteKit + Postgres + n8n
					</span>
				</div>

				<div class="mt-8 max-w-3xl space-y-5">
					<h1 class="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
						Sube tu <span class="text-cyan-700">package.json</span> y convierte deuda técnica en
						un plan de upgrade accionable.
					</h1>
					<p class="max-w-2xl text-lg leading-8 text-slate-600">
						Package Version Wizard analiza dependencias, consulta npm, prioriza riesgo técnico y
						orquesta un brief AI con n8n para que tu equipo sepa qué actualizar primero y qué
						probar después.
					</p>
				</div>

				<div class="mt-8 grid gap-4 sm:grid-cols-3">
					<div class="rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Input real</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							Leemos tu package.json de forma server-side y normalizamos dependencias por grupo.
						</p>
					</div>
					<div class="rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Análisis útil</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							Calculamos diff, riesgo preliminar, paquetes deprecated y prioridades para n8n.
						</p>
					</div>
					<div class="rounded-3xl border border-slate-200 bg-slate-50/90 p-5">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Salida premium</p>
						<p class="mt-2 text-sm leading-6 text-slate-700">
							Obtienes resumen ejecutivo, fases de upgrade, cards por paquete y radar continuo.
						</p>
					</div>
				</div>
			</div>

			<div class="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(140deg,rgba(15,23,42,0.98),rgba(14,116,144,0.94))] p-7 text-white shadow-[0_28px_100px_-45px_rgba(15,23,42,0.7)]">
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Wizard</p>
				<h2 class="mt-3 text-3xl font-bold tracking-tight">Inicia un análisis real</h2>
				<p class="mt-3 text-sm leading-7 text-slate-200">
					El flujo crea una corrida persistida en Postgres, consulta npm y delega el brief a tu
					workflow de n8n sin bloquear el request.
				</p>

				<form
					method="POST"
					action="?/analyzePackageJson"
					enctype="multipart/form-data"
					use:enhance={enhanceUpload}
					class="mt-6 space-y-5"
				>
					<label
						for="packageJson"
						class="block rounded-[1.75rem] border border-white/15 bg-white/8 p-5 transition hover:border-cyan-300/60 hover:bg-white/12"
					>
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-sm font-semibold text-white">package.json</p>
								<p class="mt-2 text-sm leading-6 text-slate-200">
									Sube el manifiesto principal del proyecto. Límite actual: 1 MB.
								</p>
							</div>
							<span class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100">
								JSON
							</span>
						</div>

						<div class="mt-5 rounded-2xl border border-dashed border-cyan-300/40 bg-slate-950/20 px-4 py-6">
							<input
								id="packageJson"
								name="packageJson"
								type="file"
								accept=".json,application/json"
								class="block w-full cursor-pointer text-sm text-slate-100 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-300"
								onchange={handleFileSelection}
								required
							/>
							<p class="mt-3 text-xs text-slate-300">
								{selectedFileName || 'Elige el archivo que quieres analizar.'}
							</p>
						</div>
					</label>

					<div class="rounded-[1.75rem] border border-white/15 bg-white/8 p-5">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-sm font-semibold text-white">Radar por Slack</p>
								<p class="mt-2 text-sm leading-6 text-slate-200">
									Opcional. Deja listo el proyecto para el workflow de seguimiento continuo.
								</p>
							</div>
							<label class="inline-flex items-center gap-3 text-sm font-medium text-slate-100">
								<input
									name="subscribeSlack"
									type="checkbox"
									bind:checked={subscribeSlack}
									class="rounded border-white/20 bg-slate-950/30 text-cyan-400 focus:ring-cyan-300"
								/>
								Activar
							</label>
						</div>

						<div class="mt-5 grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
							<label class="block">
								<span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
									Canal o destino
								</span>
								<input
									name="slackChannelTarget"
									type="text"
									placeholder="#platform-upgrades"
									bind:value={slackChannelTarget}
									class="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/25 px-4 py-3 text-sm text-white placeholder:text-slate-400"
								/>
							</label>

							<label class="block">
								<span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
									Frecuencia
								</span>
								<select
									name="slackFrequency"
									bind:value={slackFrequency}
									class="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/25 px-4 py-3 text-sm text-white"
								>
									<option value="daily">Daily</option>
									<option value="weekdays">Weekdays</option>
									<option value="twice_daily">Twice daily</option>
								</select>
							</label>
						</div>
					</div>

					<button
						type="submit"
						class="inline-flex w-full items-center justify-center gap-3 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-400"
						disabled={!analysisReady || isSubmitting}
					>
						<span class={`inline-flex h-2.5 w-2.5 rounded-full ${isSubmitting ? 'animate-pulse bg-slate-950' : 'bg-slate-950'}`}></span>
						{isSubmitting ? 'Preparando análisis...' : 'Analizar package.json'}
					</button>
				</form>

				{#if form?.message}
					<div class="mt-5 rounded-2xl border border-rose-300/70 bg-rose-50/95 px-4 py-3 text-sm text-rose-950">
						{form.message}
					</div>
				{/if}

				{#if !analysisReady}
					<div class="mt-5 rounded-2xl border border-amber-300/70 bg-amber-50/95 px-4 py-3 text-sm text-amber-950">
						Configura Postgres, el webhook privado y el callback firmado antes de lanzar análisis reales.
					</div>
				{/if}
			</div>
		</section>

		<section class="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
			<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Readiness</p>
						<h2 class="mt-2 text-2xl font-bold text-slate-950">Servicios y variables</h2>
					</div>
					<span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
						Hackathon MVP
					</span>
				</div>

				<div class="mt-6 space-y-3">
					{#each [
						{ label: 'Postgres persistido', description: '`DATABASE_URL`', ready: data.environmentReady.databaseConfigured },
						{ label: 'Webhook privado de n8n', description: '`N8N_ANALYSIS_WEBHOOK_URL` + token', ready: data.environmentReady.webhookConfigured },
						{ label: 'Callback firmado', description: '`N8N_CALLBACK_SECRET`', ready: data.environmentReady.callbackConfigured },
						{ label: 'Deep links públicos', description: '`PUBLIC_APP_URL`', ready: data.environmentReady.publicAppConfigured },
						{ label: 'Radar interno para n8n', description: '`N8N_INTERNAL_API_TOKEN`', ready: data.environmentReady.radarConfigured }
					] as item}
						<div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
							<div>
								<p class="text-sm font-semibold text-slate-900">{item.label}</p>
								<p class="text-xs text-slate-500">{item.description}</p>
							</div>
							<span class={`rounded-full px-3 py-1 text-xs font-semibold ${readinessTone(item.ready)}`}>
								{item.ready ? 'Listo' : 'Falta'}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Cómo se vende</p>
				<h2 class="mt-2 text-2xl font-bold text-slate-950">La historia que ve el jurado</h2>

				<div class="mt-6 grid gap-4 md:grid-cols-2">
					<div class="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(224,242,254,0.8))] p-5">
						<p class="text-sm font-semibold text-slate-950">Visibilidad inmediata</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							No es un chatbot genérico: el backend parsea dependencias, consulta npm y muestra
							riesgo real antes del brief AI.
						</p>
					</div>
					<div class="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(254,249,195,0.82))] p-5">
						<p class="text-sm font-semibold text-slate-950">Acción priorizada</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							El resultado separa quick wins, high risk, paquetes deprecated y fases de ejecución.
						</p>
					</div>
					<div class="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(220,252,231,0.85))] p-5">
						<p class="text-sm font-semibold text-slate-950">Persistencia real</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Cada análisis vive en Postgres, se comparte por URL y resiste recargas durante el polling.
						</p>
					</div>
					<div class="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(241,245,249,0.95))] p-5">
						<p class="text-sm font-semibold text-slate-950">Valor continuo</p>
						<p class="mt-2 text-sm leading-6 text-slate-600">
							Slack y radar continuo convierten el primer upload en un sistema que sigue aportando valor.
						</p>
					</div>
				</div>
			</div>
		</section>
	</div>
</div>
