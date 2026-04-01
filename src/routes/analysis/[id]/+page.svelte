<script lang="ts">
	import { browser } from '$app/environment';

	import AnalysisHero from '$lib/components/analysis/AnalysisHero.svelte';
	import AnalysisSidebar from '$lib/components/analysis/AnalysisSidebar.svelte';
	import SlackNotificationPanel from '$lib/components/analysis/SlackNotificationPanel.svelte';
	import AnalysisSummaryPanel from '$lib/components/analysis/AnalysisSummaryPanel.svelte';
	import DependencySection from '$lib/components/analysis/DependencySection.svelte';
	import PackageBriefCard from '$lib/components/analysis/PackageBriefCard.svelte';
	import SourcesPanel from '$lib/components/analysis/SourcesPanel.svelte';
	import TechnicalPanel from '$lib/components/analysis/TechnicalPanel.svelte';
	import { isCoveredBySpec } from '$lib/ui/analysis/helpers';

	import type { PageData } from './$types';

	let {
		data: initialData
	}: {
		data: PageData;
	} = $props();

	function getInitialAnalysis() {
		return structuredClone(initialData.analysis);
	}

	function getShareUrl() {
		return initialData.shareUrl;
	}

	let activeAnalysis = $state(getInitialAnalysis());
	let isPolling = $state(false);
	let pollingError = $state<string | null>(null);

	$effect(() => {
		if (!browser || activeAnalysis.status === 'completed' || activeAnalysis.status === 'failed') {
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
	const criticalDependencies = $derived(
		activeAnalysis.dependencies.filter((dependency) => !isCoveredBySpec(dependency)).slice(0, 8)
	);
	const coveredBySpecDependencies = $derived(
		activeAnalysis.dependencies.filter((dependency) => isCoveredBySpec(dependency)).slice(0, 8)
	);
</script>

<svelte:head>
	<title>{activeAnalysis.project.name} | Package Version Wizard</title>
	<meta name="description" content="Análisis de dependencias con brief AI y notificación Slack." />
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<AnalysisHero analysis={activeAnalysis} shareUrl={getShareUrl()} />

		<section class="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
			<div class="space-y-6">
				<AnalysisSidebar analysis={activeAnalysis} {isPolling} {pollingError} />
				<SlackNotificationPanel analysis={activeAnalysis} />
			</div>

			<AnalysisSummaryPanel analysis={activeAnalysis} />
		</section>

		<div class="space-y-6">
			<DependencySection
				terminalTitle="deps --actionable"
				eyebrow="Requieren acción"
				title="Dependencias que conviene mover"
				description="Requieren cambio en el package.json o revisión manual antes de avanzar."
				items={criticalDependencies}
				emptyMessage="Ninguna dependencia requiere cambio inmediato en el package.json."
			/>

			{#if coveredBySpecDependencies.length}
				<DependencySection
					terminalTitle="deps --resolved"
					eyebrow="Cubiertas por el rango"
					title="Ya resueltas por el package.json"
					description="El rango declarado ya cubre la latest o están alineadas. No requieren cambios."
					items={coveredBySpecDependencies}
					emptyMessage=""
				/>
			{/if}

			{#if activeAnalysis.callbackPayload?.packageBriefs.length}
				<section class="terminal-window">
					<div class="terminal-bar">
						<div class="terminal-dots">
							<span class="terminal-dot terminal-dot--red"></span>
							<span class="terminal-dot terminal-dot--yellow"></span>
							<span class="terminal-dot terminal-dot--green"></span>
						</div>
						<span class="terminal-title">$ briefs --all</span>
					</div>
					<div class="terminal-body">
						<p class="section-label">Detalle por paquete</p>
						<h2 class="mt-3 text-2xl font-bold tracking-tight text-white">Contexto por paquete</h2>

						<div class="mt-6 grid gap-4 xl:grid-cols-2">
							{#each activeAnalysis.callbackPayload.packageBriefs as brief}
								<PackageBriefCard {brief} />
							{/each}
						</div>
					</div>
				</section>
			{/if}

			{#if activeAnalysis.callbackPayload?.sources.length}
				<SourcesPanel sources={activeAnalysis.callbackPayload.sources} />
			{/if}

			<TechnicalPanel {requestJson} {callbackJson} />
		</div>
	</div>
</div>
