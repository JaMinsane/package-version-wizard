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
</script>

<section class="terminal-window">
	<div class="terminal-bar">
		<div class="terminal-dots">
			<span class="terminal-dot terminal-dot--red"></span>
			<span class="terminal-dot terminal-dot--yellow"></span>
			<span class="terminal-dot terminal-dot--green"></span>
		</div>
		<span class="terminal-title">$ upload package.json</span>
	</div>

	<div class="terminal-body">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="max-w-2xl">
				<p class="section-label">Entrada</p>
				<h2 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Inicia una corrida nueva</h2>
				<p class="mt-3 text-sm leading-7 text-[var(--text-muted)] sm:text-base">
					El formulario mantiene la experiencia simple, pero la salida queda preparada para revisión
					técnica, seguimiento y automatización.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<span class="neon-badge neon-badge--muted">Upload + análisis server-side</span>
				<button
					type="button"
					class="neon-badge neon-badge--green cursor-pointer transition-all hover:shadow-[0_0_16px_rgba(15,255,106,0.3)]"
					aria-expanded={showReadiness}
					aria-controls="environment-panel"
					onclick={toggleReadiness}
				>
					<span class="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"></span>
					Estado del stack
				</button>
			</div>
		</div>

		{#if showReadiness}
			<div
				id="environment-panel"
				class="mt-6 grid gap-3 rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.6)] p-4 sm:grid-cols-2"
			>
				{#each readinessItems as item}
					<div class="data-cell">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-sm font-semibold text-white">{item.label}</p>
								<p class="mt-1 text-xs text-[var(--text-dim)]">{item.description}</p>
							</div>
							{#if item.ready}
								<span class="neon-badge neon-badge--green">Listo</span>
							{:else}
								<span class="neon-badge neon-badge--amber">Pendiente</span>
							{/if}
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
			<div class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5 sm:p-6">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Archivo</p>
						<h3 class="mt-3 text-xl font-bold text-white">package.json</h3>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted)]">
							Sube el manifiesto principal del proyecto. La app lo valida y prepara la corrida sin
							exponer lógica sensible en el cliente.
						</p>
					</div>
					<span class="neon-badge neon-badge--cyan">Límite 1 MB</span>
				</div>

				<div class="mt-6 rounded-lg border border-dashed border-[var(--neon-green)]/30 bg-[rgba(10,10,15,0.8)] p-5">
					<input
						id="packageJson"
						name="packageJson"
						type="file"
						accept=".json,application/json"
						class="block w-full cursor-pointer text-sm text-[var(--text-primary)] file:mr-4 file:rounded-md file:border file:border-[var(--neon-green)] file:bg-transparent file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-[var(--neon-green)] hover:file:bg-[rgba(15,255,106,0.1)]"
						onchange={handleFileSelection}
						required
					/>
					<p class="mt-4 data-cell text-sm text-[var(--text-muted)]">
						<span class="text-[var(--neon-green)] mr-2">{'>'}</span>{selectedFileName || 'Elige el archivo que quieres analizar.'}
					</p>
				</div>
			</div>

			<div class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5 sm:p-6">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Automatización</p>
						<h3 class="mt-3 text-xl font-bold text-white">Radar por Slack</h3>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted)]">
							Opcional. Deja conectado el proyecto para observar cambios relevantes después de esta
							primera corrida.
						</p>
					</div>
					<label class="neon-badge neon-badge--green cursor-pointer">
						<input
							name="subscribeSlack"
							type="checkbox"
							bind:checked={subscribeSlack}
							class="rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
						/>
						Activar
					</label>
				</div>

				<div class="mt-6 grid gap-4">
					<label class="block">
						<span class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">
							Canal o destino
						</span>
						<input
							name="slackChannelTarget"
							type="text"
							placeholder="#platform-upgrades"
							bind:value={slackChannelTarget}
							class="mt-2 w-full"
						/>
					</label>

					<label class="block">
						<span class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">
							Frecuencia
						</span>
						<select
							name="slackFrequency"
							bind:value={slackFrequency}
							class="mt-2 w-full"
						>
							<option value="daily">Diario</option>
							<option value="weekdays">Lunes a viernes</option>
							<option value="twice_daily">Dos veces al día</option>
						</select>
					</label>
				</div>

				<div class="data-cell mt-6">
					<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Salida esperada</p>
					<p class="mt-3 text-sm leading-7 text-[var(--text-muted)]">
						La corrida devuelve progreso persistido, dependencias priorizadas, brief renderizado y
						un punto de partida claro para el siguiente paso.
					</p>
				</div>
			</div>

			<div class="xl:col-span-2">
				<button
					type="submit"
					class="neon-button w-full"
					disabled={!analysisReady || isSubmitting}
				>
					<span class={`inline-block h-2.5 w-2.5 rounded-full bg-[#0a0a0f] ${isSubmitting ? 'animate-pulse' : ''}`}></span>
					{isSubmitting ? 'Preparando análisis...' : '[ ANALIZAR PACKAGE.JSON ]'}
				</button>

				{#if formMessage}
					<div class="alert-box alert-box--red mt-4">
						{formMessage}
					</div>
				{/if}

				{#if !analysisReady}
					<div class="alert-box alert-box--amber mt-4">
						Completa Postgres, el webhook privado y el callback firmado antes de lanzar corridas
						reales.
					</div>
				{/if}
			</div>
		</form>
	</div>
</section>
