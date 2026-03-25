<script lang="ts">
	import DependencyCard from '$lib/components/analysis/DependencyCard.svelte';
	import type { AnalysisDependency } from '$lib/ui/analysis/types';

	interface Props {
		eyebrow: string;
		title: string;
		description: string;
		items: AnalysisDependency[];
		emptyMessage: string;
	}

	let { eyebrow, title, description, items, emptyMessage }: Props = $props();
</script>

<section class="surface-panel rounded-[2rem] p-6 sm:p-8">
	<p class="section-label">{eyebrow}</p>
	<h2 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
	<p class="mt-3 text-sm leading-7 text-slate-300">{description}</p>

	<div class="mt-6 grid gap-4 xl:grid-cols-2">
		{#if items.length}
			{#each items as dependency}
				<DependencyCard {dependency} />
			{/each}
		{:else}
			<div class="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm text-cyan-100 xl:col-span-2">
				{emptyMessage}
			</div>
		{/if}
	</div>
</section>
