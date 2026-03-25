<script lang="ts">
	import { formatSourceDescriptor } from '$lib/ui/analysis/helpers';
	import type { AnalysisSource } from '$lib/ui/analysis/types';

	interface Props {
		sources: AnalysisSource[];
	}

	let { sources }: Props = $props();
</script>

<section class="terminal-window">
	<div class="terminal-bar">
		<div class="terminal-dots">
			<span class="terminal-dot terminal-dot--red"></span>
			<span class="terminal-dot terminal-dot--yellow"></span>
			<span class="terminal-dot terminal-dot--green"></span>
		</div>
		<span class="terminal-title">$ sources --list</span>
	</div>

	<div class="terminal-body">
		<p class="section-label">Fuentes</p>
		<h2 class="mt-3 text-2xl font-bold tracking-tight text-white">Trazabilidad del análisis</h2>

		<div class="mt-6 grid gap-3">
			{#each sources as source}
				<a
					class="link-row"
					href={source.url}
					target="_blank"
					rel="noreferrer"
				>
					<span>
						<span class="font-bold text-white">{source.packageName}</span>
						<span class="ml-2 text-[var(--text-dim)]">{formatSourceDescriptor(source)}</span>
					</span>
					<span class="text-xs text-[var(--text-dim)]">abrir →</span>
				</a>
			{/each}
		</div>
	</div>
</section>
