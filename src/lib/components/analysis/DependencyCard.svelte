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

<article class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5 transition-all hover:border-[rgba(15,255,106,0.3)] hover:shadow-[0_0_16px_rgba(15,255,106,0.08)]">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h3 class="text-lg font-bold text-white">{dependency.name}</h3>
			<p class="mt-2 text-sm text-[var(--text-dim)]">{formatDependencyVersionLine(dependency)}</p>
		</div>
		<div class="flex flex-wrap justify-end gap-2">
			<span class={getDependencyStatusTone(getDependencyDisplayStatus(dependency))}>
				{getDependencyStatusLabel(dependency)}
			</span>
			<span class={getDecisionTone(dependency.decision)}>
				{getDecisionLabel(dependency.decision)}
			</span>
		</div>
	</div>

	<div class="mt-5 grid gap-3 sm:grid-cols-2">
		<div class="data-cell">
			<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Grupo</p>
			<p class="mt-1 text-sm font-medium text-[var(--text-primary)]">{dependency.group}</p>
		</div>
		<div class="data-cell">
			<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Risk score</p>
			<p class="mt-1 text-sm font-medium text-[var(--text-primary)]">{dependency.riskScore}/100</p>
		</div>
	</div>

	{#if dependency.deprecated}
		<div class="alert-box alert-box--red mt-4">
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
					class="neon-badge neon-badge--muted transition-all hover:border-[rgba(15,255,106,0.3)] hover:text-[var(--neon-green)]"
				>
					fuente
				</a>
			{/each}
		</div>
	{/if}
</article>
