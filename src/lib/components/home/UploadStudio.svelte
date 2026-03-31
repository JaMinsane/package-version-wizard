<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	import { readinessItemDefinitions } from '$lib/ui/home/content';
	import type { EnvironmentReadiness } from '$lib/ui/home/types';

	interface Props {
		environmentReady: EnvironmentReadiness;
		formMessage?: string;
	}

	let { environmentReady, formMessage }: Props = $props();

	let isSubmitting = $state(false);
	let selectedFileName = $state('');
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

<section id="upload" class="terminal-window">
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
				<h2 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
					Nuevo análisis
				</h2>
				<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)] sm:text-base">
					Sube tu package.json y obtén el reporte. La integración con Slack es opcional y se configura en tu perfil.
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
					<span
						class="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"
					></span>
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
			<div
				class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5 sm:p-6"
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs font-bold tracking-widest text-[var(--text-muted-relaxed)] uppercase">
							Archivo
						</p>
						<h3 class="mt-3 text-xl font-bold text-white">package.json</h3>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
							Sube el archivo principal del proyecto. Se valida y procesa en el servidor.
						</p>
					</div>
					<span class="neon-badge neon-badge--cyan">Límite 1 MB</span>
				</div>

				<div
					class="mt-6 rounded-lg border border-dashed border-[var(--neon-green)]/30 bg-[rgba(10,10,15,0.8)] p-5"
				>
					<input
						id="packageJson"
						name="packageJson"
						type="file"
						accept=".json,application/json"
						class="block w-full cursor-pointer text-sm text-[var(--text-primary)] file:mr-4 file:rounded-md file:border file:border-[var(--neon-green)] file:bg-transparent file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-[var(--neon-green)] hover:file:bg-[rgba(15,255,106,0.1)]"
						onchange={handleFileSelection}
						required
					/>
					<p class="data-cell mt-4 text-sm text-[var(--text-muted-relaxed)]">
						<span class="mr-2 text-[var(--neon-green)]">{'>'}</span>{selectedFileName ||
							'Elige el archivo que quieres analizar.'}
					</p>
				</div>
			</div>

			<div
				class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5 sm:p-6"
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs font-bold tracking-widest text-[var(--text-muted-relaxed)] uppercase">
							Notificaciones
						</p>
						<h3 class="mt-3 text-xl font-bold text-white">Notificaciones Slack</h3>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
							El análisis funciona sin Slack. Si quieres recibir notificaciones, configúralo
							desde el menú de usuario o con el acceso directo de abajo.
						</p>
					</div>
					<a href="/settings/integrations/slack" class="neon-badge neon-badge--green">
						Abrir configuración
					</a>
				</div>

				<div class="data-cell mt-6">
					<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
						Salida esperada
					</p>
					<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
						Al terminar obtienes: dependencias priorizadas, brief AI y, si Slack está activo,
						un mensaje con el link al análisis.
					</p>
				</div>
			</div>

			<div class="xl:col-span-2">
				<button type="submit" class="neon-button w-full" disabled={!analysisReady || isSubmitting}>
					<span
						class={`inline-block h-2.5 w-2.5 rounded-full bg-[#0a0a0f] ${isSubmitting ? 'animate-pulse' : ''}`}
					></span>
					{isSubmitting ? 'Preparando análisis...' : '[ ANALIZAR PACKAGE.JSON ]'}
				</button>

				{#if formMessage}
					<div class="alert-box alert-box--red mt-4">
						{formMessage}
					</div>
				{/if}

				{#if !analysisReady}
					<div class="alert-box alert-box--amber mt-4">
						Configura Postgres, el webhook de n8n y el callback antes de lanzar análisis.
					</div>
				{/if}
			</div>
		</form>
	</div>
</section>
