<script lang="ts">
	import {
		formatSourceDescriptor,
		getConfidenceTone,
		getEvidenceMessage,
		getEvidenceTone,
		getRiskLevelTone
	} from '$lib/ui/analysis/helpers';
	import type { AnalysisPackageBrief } from '$lib/ui/analysis/types';

	interface Props {
		brief: AnalysisPackageBrief;
	}

	let { brief }: Props = $props();
</script>

<article class="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
	<div class="flex items-start justify-between gap-3">
		<h3 class="text-xl font-semibold text-white">{brief.name}</h3>
		<div class="flex flex-wrap justify-end gap-2">
			<span class={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskLevelTone(brief.riskLevel)}`}>
				{brief.riskLevel ?? 'medium'} risk
			</span>
			<span class={`rounded-full border px-3 py-1 text-xs font-semibold ${getConfidenceTone(brief.confidence)}`}>
				confidence {brief.confidence ?? 'low'}
			</span>
			<span class={`rounded-full border px-3 py-1 text-xs font-semibold ${getEvidenceTone(brief.evidenceStatus)}`}>
				{brief.evidenceStatus ?? 'none'}
			</span>
		</div>
	</div>

	<p class="mt-3 text-sm leading-7 text-slate-300">{brief.summary}</p>

	<div class="mt-4 rounded-[1.2rem] border border-white/8 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
		{getEvidenceMessage(brief)}
	</div>

	{#if (brief.breakingChanges ?? []).length}
		<div class="mt-5">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Breaking changes</p>
			<ul class="mt-2 space-y-2 text-sm text-slate-300">
				{#each brief.breakingChanges ?? [] as change}
					<li class="rounded-[1rem] border border-rose-400/12 bg-rose-400/10 px-3 py-2">{change}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if (brief.recommendedActions ?? []).length}
		<div class="mt-5">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recommended actions</p>
			<ul class="mt-2 space-y-2 text-sm text-slate-300">
				{#each brief.recommendedActions ?? [] as action}
					<li class="rounded-[1rem] border border-white/8 bg-white/[0.04] px-3 py-2">{action}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if (brief.testFocus ?? []).length}
		<div class="mt-5">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Test focus</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each brief.testFocus ?? [] as focus}
					<span class="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
						{focus}
					</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if (brief.sources ?? []).length}
		<div class="mt-5">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Evidence</p>
			<div class="mt-2 grid gap-2">
				{#each brief.sources ?? [] as source}
					<a
						class="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-300/25 hover:bg-white/8"
						href={source.url}
						target="_blank"
						rel="noreferrer"
					>
						<span class="flex items-center gap-2">
							<span class="font-medium text-white">{formatSourceDescriptor(source)}</span>
							<span class="text-xs text-slate-500">{source.packageName}</span>
						</span>
						<span class="font-mono text-xs text-slate-500">open</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</article>
