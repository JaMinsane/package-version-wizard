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
	let isDragging = $state(false);
	let showReadiness = $state(false);
	let fileInputRef: HTMLInputElement | undefined = $state(undefined);

	const uploadHighlights = [
		{
			label: 'Entrada',
			title: 'Un package.json por análisis',
			description: 'Lo validamos y procesamos del lado del servidor antes de consultar versiones.'
		},
		{
			label: 'Salida',
			title: 'Brief AI con prioridades',
			description:
				'Recibes dependencias relevantes, contexto de upgrades y un resumen listo para revisar.'
		},
		{
			label: 'Slack',
			title: 'Opcional y al final',
			description:
				'La notificación solo se envía al terminar el flujo y requiere configuración previa.'
		}
	] as const;

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

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const file = event.dataTransfer?.files[0];
		if (file && fileInputRef) {
			const dt = new DataTransfer();
			dt.items.add(file);
			fileInputRef.files = dt.files;
			selectedFileName = file.name;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
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
		<div class="grid gap-6 xl:grid-cols-[1.18fr_0.82fr] xl:items-start">
			<div class="max-w-3xl">
				<div class="flex flex-wrap items-center gap-3">
					<span class="neon-badge neon-badge--green">
						<span
							class="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"
						></span>
						Nuevo análisis
					</span>
					<span class="neon-badge neon-badge--muted">Upload + análisis server-side</span>
				</div>

				<p class="section-label mt-6">Entrada</p>
				<h2 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
					Sube tu package.json y obtén un brief de upgrade claro y accionable
				</h2>
				<p class="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted-relaxed)] sm:text-base">
					Analizamos dependencias, detectamos versiones más nuevas y armamos un resumen para
					priorizar el upgrade. Slack es opcional: si lo configuras antes, la notificación sale
					siempre al final; si no, el análisis funciona igual.
				</p>
			</div>

			<aside class="upload-side-note">
				<div class="flex items-center justify-between gap-3">
					<p class="section-label">Slack</p>
					<span class="neon-badge neon-badge--cyan">Opcional</span>
				</div>
				<h3 class="mt-3 text-lg font-semibold text-white">Notificación de cierre</h3>
				<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
					Si quieres aviso en tu canal, configura la integración antes de analizar. El mensaje no
					sale a mitad del flujo: solo cuando el procesamiento termina.
				</p>
				<a
					href="/settings/integrations/slack"
					class="upload-side-link mt-5 inline-flex items-center gap-2"
				>
					<span>$ open</span>
					<span>Configurar Slack</span>
				</a>
			</aside>
		</div>

		<div class="mt-6 grid gap-3 md:grid-cols-3">
			{#each uploadHighlights as item}
				<article class="upload-highlight">
					<p class="text-xs font-bold tracking-[0.24em] text-[var(--text-dim)] uppercase">
						{item.label}
					</p>
					<h3 class="mt-3 text-sm font-semibold text-white sm:text-base">{item.title}</h3>
					<p class="mt-2 text-sm leading-6 text-[var(--text-muted-relaxed)]">
						{item.description}
					</p>
				</article>
			{/each}
		</div>

		<form
			method="POST"
			action="?/analyzePackageJson"
			enctype="multipart/form-data"
			use:enhance={enhanceUpload}
			class="mt-8 flex flex-col gap-6"
		>
			<!-- Drop zone -->
			<div
				class="upload-drop-zone"
				class:upload-drop-zone--active={isDragging}
				class:upload-drop-zone--selected={!!selectedFileName}
				role="button"
				tabindex="0"
				ondrop={handleDrop}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				onclick={() => fileInputRef?.click()}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') fileInputRef?.click();
				}}
			>
				<input
					bind:this={fileInputRef}
					id="packageJson"
					name="packageJson"
					type="file"
					accept=".json,application/json"
					class="sr-only"
					onchange={handleFileSelection}
					required
				/>

				{#if selectedFileName}
					<div class="flex flex-col items-center gap-3">
						<span class="upload-icon upload-icon--ready">✓</span>
						<p class="text-base font-semibold text-white">{selectedFileName}</p>
						<p class="text-xs text-[var(--text-dim)]">
							Click o arrastra otro archivo para reemplazar
						</p>
					</div>
				{:else}
					<div class="flex flex-col items-center gap-3">
						<span class="upload-icon">↑</span>
						<p class="text-base font-semibold text-white">Arrastra tu package.json aquí</p>
						<p class="text-xs text-[var(--text-dim)]">
							o haz click para seleccionarlo <span class="text-[var(--text-muted-relaxed)]"
								>· máx 1 MB</span
							>
						</p>
					</div>
				{/if}
			</div>

			<!-- Submit -->
			<button
				type="submit"
				class="neon-button w-full"
				disabled={!analysisReady || isSubmitting || !selectedFileName}
			>
				<span
					class={`inline-block h-2.5 w-2.5 rounded-full bg-[#0a0a0f] ${isSubmitting ? 'animate-pulse' : ''}`}
				></span>
				{isSubmitting ? 'Preparando análisis...' : '[ ANALIZAR PACKAGE.JSON ]'}
			</button>

			{#if formMessage}
				<div class="alert-box alert-box--red">
					{formMessage}
				</div>
			{/if}

			{#if !analysisReady}
				<div class="alert-box alert-box--amber">
					Configura Postgres, el webhook de n8n y el callback antes de lanzar análisis.
				</div>
			{/if}
		</form>

		<!-- Stack readiness toggle (secondary, collapsed by default) -->
		<div class="mt-6 flex items-center gap-3">
			<button
				type="button"
				class="neon-badge neon-badge--green cursor-pointer text-xs transition-all hover:shadow-[0_0_16px_rgba(15,255,106,0.3)]"
				aria-expanded={showReadiness}
				aria-controls="environment-panel"
				onclick={toggleReadiness}
			>
				<span
					class="inline-block h-1.5 w-1.5 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"
				></span>
				Estado del stack
			</button>
			<a
				href="/settings/integrations/slack"
				class="neon-badge neon-badge--muted text-xs transition-all hover:border-[rgba(0,229,255,0.4)] hover:text-[var(--neon-cyan)]"
			>
				Configurar Slack →
			</a>
		</div>

		{#if showReadiness}
			<div
				id="environment-panel"
				class="mt-4 grid gap-3 rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.6)] p-4 sm:grid-cols-2"
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
	</div>
</section>

<style>
	.upload-side-note {
		border-radius: 0.9rem;
		border: 1px solid rgba(0, 229, 255, 0.18);
		background:
			linear-gradient(145deg, rgba(0, 229, 255, 0.08), rgba(15, 255, 106, 0.04)),
			rgba(10, 10, 15, 0.72);
		padding: 1.25rem;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.03),
			0 0 30px rgba(0, 229, 255, 0.06);
	}

	.upload-side-link {
		border-radius: 0.65rem;
		border: 1px solid rgba(0, 229, 255, 0.22);
		background: rgba(0, 229, 255, 0.06);
		padding: 0.7rem 0.95rem;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--neon-cyan);
		letter-spacing: 0.04em;
		transition:
			border-color 0.2s ease,
			background 0.2s ease,
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.upload-side-link:hover {
		border-color: rgba(0, 229, 255, 0.42);
		background: rgba(0, 229, 255, 0.1);
		box-shadow: 0 0 20px rgba(0, 229, 255, 0.1);
		transform: translateY(-1px);
	}

	.upload-highlight {
		border-radius: 0.75rem;
		border: 1px solid var(--border-green);
		background:
			linear-gradient(180deg, rgba(15, 255, 106, 0.04), transparent 60%), rgba(10, 10, 15, 0.58);
		padding: 1rem 1rem 1.1rem;
	}

	.upload-drop-zone {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 180px;
		padding: 2rem;
		border-radius: 0.75rem;
		border: 2px dashed rgba(15, 255, 106, 0.2);
		background: rgba(10, 10, 15, 0.6);
		cursor: pointer;
		transition: all 0.25s ease;
	}

	.upload-drop-zone:hover,
	.upload-drop-zone:focus-visible {
		border-color: rgba(15, 255, 106, 0.45);
		background: rgba(15, 255, 106, 0.04);
		box-shadow: 0 0 30px rgba(15, 255, 106, 0.06);
	}

	.upload-drop-zone--active {
		border-color: var(--neon-green);
		background: rgba(15, 255, 106, 0.08);
		box-shadow: 0 0 40px rgba(15, 255, 106, 0.12);
	}

	.upload-drop-zone--selected {
		border-color: rgba(15, 255, 106, 0.4);
		border-style: solid;
	}

	.upload-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border: 2px solid rgba(15, 255, 106, 0.3);
		color: var(--neon-green);
		font-size: 1.25rem;
		font-weight: bold;
		transition: all 0.25s ease;
	}

	.upload-icon--ready {
		border-color: var(--neon-green);
		background: rgba(15, 255, 106, 0.12);
		box-shadow: 0 0 16px rgba(15, 255, 106, 0.25);
	}

	.upload-drop-zone:hover .upload-icon {
		border-color: rgba(15, 255, 106, 0.5);
		box-shadow: 0 0 12px rgba(15, 255, 106, 0.15);
	}
</style>
