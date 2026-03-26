<script lang="ts">
	import UploadStudio from '$lib/components/home/UploadStudio.svelte';

	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Subir package.json | Package Version Wizard</title>
	<meta
		name="description"
		content="Sube tu package.json para iniciar un análisis de dependencias con brief AI y notificación final opcional en Slack."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 sm:gap-8">
		<div class="text-center">
			<p class="section-label">Nuevo análisis</p>
			<h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
				Sube tu manifiesto
			</h1>
			<p class="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted-relaxed)]">
				Carga tu <code class="text-[var(--neon-green)]">package.json</code> para iniciar el análisis de
				dependencias, obtener un brief AI y publicar el resultado final en Slack si lo tienes configurado.
			</p>
		</div>

		<UploadStudio environmentReady={data.environmentReady} formMessage={form?.message} />
	</div>
</div>
