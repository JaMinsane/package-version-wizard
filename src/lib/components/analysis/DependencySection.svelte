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

<section class="terminal-window">
	<div class="terminal-bar">
		<div class="terminal-dots">
			<span class="terminal-dot terminal-dot--red"></span>
			<span class="terminal-dot terminal-dot--yellow"></span>
			<span class="terminal-dot terminal-dot--green"></span>
		</div>
		<span class="terminal-title">$ deps --list</span>
	</div>

	<div class="terminal-body">
		<p class="section-label">{eyebrow}</p>
		<h2 class="mt-3 text-2xl font-bold tracking-tight text-white">{title}</h2>
		<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">{description}</p>

		<div class="mt-6 grid gap-4 xl:grid-cols-2">
			{#if items.length}
				{#each items as dependency}
					<DependencyCard {dependency} />
				{/each}
			{:else}
				<div class="alert-box alert-box--green xl:col-span-2">
					{emptyMessage}
				</div>
			{/if}
		</div>
	</div>
</section>
