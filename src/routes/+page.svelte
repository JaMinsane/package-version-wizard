<script lang="ts">
	import HeroSection from '$lib/components/home/HeroSection.svelte';
	import SignalGrid from '$lib/components/home/SignalGrid.svelte';
	import WorkflowSection from '$lib/components/home/WorkflowSection.svelte';
</script>

<svelte:head>
	<title>Package Version Wizard | Inteligencia visual para upgrades npm</title>
	<meta
		name="description"
		content="Sube tu package.json y revisa un análisis persistido con diff de dependencias, brief AI y notificación final opcional en Slack."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-6 sm:gap-8">
		<HeroSection />
		<SignalGrid />
		<WorkflowSection />
	</div>
</div>
