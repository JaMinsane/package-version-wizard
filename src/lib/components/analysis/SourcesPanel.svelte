<script lang="ts">
	import { formatSourceDescriptor } from '$lib/ui/analysis/helpers';
	import type { AnalysisSource } from '$lib/ui/analysis/types';

	interface Props {
		sources: AnalysisSource[];
	}

	let { sources }: Props = $props();
</script>

<section class="surface-panel rounded-[2rem] p-6 sm:p-8">
	<p class="section-label">Fuentes</p>
	<h2 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Trazabilidad del análisis</h2>

	<div class="mt-6 grid gap-3">
		{#each sources as source}
			<a
				class="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-300/25 hover:bg-white/8"
				href={source.url}
				target="_blank"
				rel="noreferrer"
			>
				<span>
					<span class="font-semibold text-white">{source.packageName}</span>
					<span class="ml-2 text-slate-500">{formatSourceDescriptor(source)}</span>
				</span>
				<span class="font-mono text-xs text-slate-500">abrir</span>
			</a>
		{/each}
	</div>
</section>
