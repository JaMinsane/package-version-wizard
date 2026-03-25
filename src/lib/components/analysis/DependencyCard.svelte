<script lang="ts">
	import {
		formatDependencyVersionLine,
		getDecisionLabel,
		getDecisionTone,
		getDependencyDisplayStatus,
		getDependencyStatusLabel,
		getDependencyStatusTone
	} from '$lib/ui/analysis/helpers';
	import type { AnalysisDependency } from '$lib/ui/analysis/types';

	interface Props {
		dependency: AnalysisDependency;
	}

	let { dependency }: Props = $props();
</script>

<article class="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h3 class="text-xl font-semibold text-white">{dependency.name}</h3>
			<p class="mt-2 text-sm text-slate-400">{formatDependencyVersionLine(dependency)}</p>
		</div>
		<div class="flex flex-wrap justify-end gap-2">
			<span class={`rounded-full border px-3 py-1 text-xs font-semibold ${getDependencyStatusTone(getDependencyDisplayStatus(dependency))}`}>
				{getDependencyStatusLabel(dependency)}
			</span>
			<span class={`rounded-full border px-3 py-1 text-xs font-semibold ${getDecisionTone(dependency.decision)}`}>
				{getDecisionLabel(dependency.decision)}
			</span>
		</div>
	</div>

	<div class="mt-5 grid gap-3 sm:grid-cols-2">
		<div class="rounded-[1.2rem] border border-white/8 bg-slate-950/40 px-4 py-3">
			<p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Grupo</p>
			<p class="mt-1 text-sm font-medium text-slate-200">{dependency.group}</p>
		</div>
		<div class="rounded-[1.2rem] border border-white/8 bg-slate-950/40 px-4 py-3">
			<p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Risk score</p>
			<p class="mt-1 text-sm font-medium text-slate-200">{dependency.riskScore}/100</p>
		</div>
	</div>

	{#if dependency.deprecated}
		<div class="mt-4 rounded-[1.2rem] border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm text-fuchsia-100">
			Este paquete aparece como deprecated y merece atención prioritaria.
		</div>
	{/if}

	{#if dependency.sourceUrls.length}
		<div class="mt-4 flex flex-wrap gap-2">
			{#each dependency.sourceUrls as url}
				<a
					href={url}
					target="_blank"
					rel="noreferrer"
					class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-300/25 hover:bg-white/8"
				>
					fuente
				</a>
			{/each}
		</div>
	{/if}
</article>
