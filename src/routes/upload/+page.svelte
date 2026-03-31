<script lang="ts">
	import UploadStudio from '$lib/components/home/UploadStudio.svelte';

	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Nuevo análisis | Package Version Wizard</title>
	<meta
		name="description"
		content="Sube tu package.json para analizar dependencias con brief AI."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-2xl flex-col gap-6 sm:gap-8">
		<UploadStudio environmentReady={data.environmentReady} formMessage={form?.message} />
	</div>
</div>
