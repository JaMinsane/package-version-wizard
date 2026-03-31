<script lang="ts">
	import UploadStudio from '$lib/components/home/UploadStudio.svelte';

	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nuevo análisis | Package Version Wizard</title>
	<meta
		name="description"
		content="Sube tu package.json para analizar dependencias con brief AI y notificación opcional en Slack."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 sm:gap-8">
		<div class="text-center">
			<p class="section-label">Nuevo análisis</p>
			<h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
				Sube tu package.json
			</h1>
			<p class="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted-relaxed)]">
				Selecciona el archivo, espera el análisis y revisa el brief.
				Si tienes Slack configurado, la notificación sale automáticamente.
			</p>
			<div class="mt-5 flex justify-center">
				<a
					href="/settings/integrations/slack"
					class="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.06)] px-4 py-2 text-sm font-semibold text-[var(--neon-cyan)] transition-all hover:border-[rgba(0,229,255,0.4)] hover:bg-[rgba(0,229,255,0.1)] hover:shadow-[0_0_18px_rgba(0,229,255,0.18)]"
				>
					<span>$ open</span>
					<span class="text-[var(--text-foreground)]">Configuración de Slack</span>
				</a>
			</div>
		</div>

		<UploadStudio environmentReady={data.environmentReady} formMessage={form?.message} />
	</div>
</div>
