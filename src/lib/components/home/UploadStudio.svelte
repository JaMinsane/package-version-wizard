<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	import { readinessItemDefinitions } from '$lib/ui/home/content';
	import type { EnvironmentReadiness, HomeFormValues } from '$lib/ui/home/types';

	interface Props {
		environmentReady: EnvironmentReadiness;
		formMessage?: string;
		initialValues: HomeFormValues;
	}

	let { environmentReady, formMessage, initialValues }: Props = $props();

	let isSubmitting = $state(false);
	let selectedFileName = $state('');
	let subscribeSlack = $state(false);
	let slackChannelTarget = $state('');
	let slackFrequency = $state<HomeFormValues['slackFrequency']>('daily');
	let showReadiness = $state(false);

	const analysisReady = $derived(
		environmentReady.databaseConfigured &&
			environmentReady.webhookConfigured &&
			environmentReady.callbackConfigured
	);

	const readinessItems = $derived(
		readinessItemDefinitions.map((item) => ({
			...item,
			ready: environmentReady[item.key]
		}))
	);

	$effect(() => {
		subscribeSlack = initialValues.subscribeSlack;
		slackChannelTarget = initialValues.slackChannelTarget;
		slackFrequency = initialValues.slackFrequency;
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

	function toggleReadiness() {
		showReadiness = !showReadiness;
	}

	function getReadinessTone(ready: boolean) {
		return ready
			? 'border-emerald-400/20 bg-emerald-400/12 text-emerald-100'
			: 'border-amber-400/20 bg-amber-400/12 text-amber-100';
	}
</script>

<section class="surface-panel rounded-[2rem] p-6 sm:p-8">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="max-w-2xl">
			<p class="section-label">Entrada</p>
			<h2 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Inicia una corrida nueva</h2>
			<p class="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
				El formulario mantiene la experiencia simple, pero la salida queda preparada para revisión
				técnica, seguimiento y automatización.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<span class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300">
				Upload + análisis server-side
			</span>
			<button
				type="button"
				class="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-300/35 hover:bg-white/8"
				aria-expanded={showReadiness}
				aria-controls="environment-panel"
				onclick={toggleReadiness}
			>
				<span class="inline-flex h-2 w-2 rounded-full bg-cyan-300"></span>
				Estado del stack
			</button>
		</div>
	</div>

	{#if showReadiness}
		<div
			id="environment-panel"
			class="mt-6 grid gap-3 rounded-[1.6rem] border border-white/10 bg-slate-950/45 p-4 sm:grid-cols-2"
		>
			{#each readinessItems as item}
				<div class="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-sm font-semibold text-white">{item.label}</p>
							<p class="mt-1 text-xs text-slate-400">{item.description}</p>
						</div>
						<span class={`rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${getReadinessTone(item.ready)}`}>
							{item.ready ? 'Listo' : 'Pendiente'}
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<form
		method="POST"
		action="?/analyzePackageJson"
		enctype="multipart/form-data"
		use:enhance={enhanceUpload}
		class="mt-6 grid gap-5 xl:grid-cols-[1.14fr_0.86fr]"
	>
		<div class="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Archivo</p>
					<h3 class="mt-3 text-2xl font-semibold text-white">package.json</h3>
					<p class="mt-3 text-sm leading-7 text-slate-300">
						Sube el manifiesto principal del proyecto. La app lo valida y prepara la corrida sin
						exponer lógica sensible en el cliente.
					</p>
				</div>
				<span class="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
					Límite 1 MB
				</span>
			</div>

			<div class="mt-6 rounded-[1.6rem] border border-dashed border-cyan-300/35 bg-slate-950/40 p-5">
				<input
					id="packageJson"
					name="packageJson"
					type="file"
					accept=".json,application/json"
					class="block w-full cursor-pointer text-sm text-slate-100 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-200"
					onchange={handleFileSelection}
					required
				/>
				<p class="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
					{selectedFileName || 'Elige el archivo que quieres analizar.'}
				</p>
			</div>
		</div>

		<div class="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 sm:p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Automatización</p>
					<h3 class="mt-3 text-2xl font-semibold text-white">Radar por Slack</h3>
					<p class="mt-3 text-sm leading-7 text-slate-300">
						Opcional. Deja conectado el proyecto para observar cambios relevantes después de esta
						primera corrida.
					</p>
				</div>
				<label class="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-100">
					<input
						name="subscribeSlack"
						type="checkbox"
						bind:checked={subscribeSlack}
						class="rounded border-white/20 bg-slate-950/30 text-cyan-300 focus:ring-cyan-300"
					/>
					Activar
				</label>
			</div>

			<div class="mt-6 grid gap-4">
				<label class="block">
					<span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
						Canal o destino
					</span>
					<input
						name="slackChannelTarget"
						type="text"
						placeholder="#platform-upgrades"
						bind:value={slackChannelTarget}
						class="mt-2 w-full rounded-[1.1rem] border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white placeholder:text-slate-500"
					/>
				</label>

				<label class="block">
					<span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
						Frecuencia
					</span>
					<select
						name="slackFrequency"
						bind:value={slackFrequency}
						class="mt-2 w-full rounded-[1.1rem] border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white"
					>
						<option value="daily">Diario</option>
						<option value="weekdays">Lunes a viernes</option>
						<option value="twice_daily">Dos veces al día</option>
					</select>
				</label>
			</div>

			<div class="mt-6 rounded-[1.25rem] border border-white/10 bg-slate-950/45 p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Salida esperada</p>
				<p class="mt-3 text-sm leading-7 text-slate-300">
					La corrida devuelve progreso persistido, dependencias priorizadas, brief renderizado y
					un punto de partida claro para el siguiente paso.
				</p>
			</div>
		</div>

		<div class="xl:col-span-2">
			<button
				type="submit"
				class="inline-flex w-full items-center justify-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300 px-6 py-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-700 disabled:text-slate-400"
				disabled={!analysisReady || isSubmitting}
			>
				<span class={`inline-flex h-2.5 w-2.5 rounded-full ${isSubmitting ? 'animate-pulse bg-slate-950' : 'bg-slate-950'}`}></span>
				{isSubmitting ? 'Preparando análisis...' : 'Analizar package.json'}
			</button>

			{#if formMessage}
				<div class="mt-4 rounded-[1.25rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
					{formMessage}
				</div>
			{/if}

			{#if !analysisReady}
				<div class="mt-4 rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
					Completa Postgres, el webhook privado y el callback firmado antes de lanzar corridas
					reales.
				</div>
			{/if}
		</div>
	</form>
</section>
