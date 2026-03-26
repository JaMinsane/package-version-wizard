<script lang="ts">
	import {
		getConfidenceLabel,
		formatSourceDescriptor,
		getEvidenceMessage,
		getEvidenceLabel,
		getEvidenceTone,
		getRiskLevelLabel,
		getConfidenceTone,
		getRiskLevelTone
	} from '$lib/ui/analysis/helpers';
	import type { AnalysisPackageBrief } from '$lib/ui/analysis/types';

	interface Props {
		brief: AnalysisPackageBrief;
	}

	let { brief }: Props = $props();
</script>

<article class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5 transition-all hover:border-[rgba(15,255,106,0.3)] hover:shadow-[0_0_16px_rgba(15,255,106,0.08)]">
	<div class="flex items-start justify-between gap-3">
		<h3 class="text-lg font-bold text-white">{brief.name}</h3>
		<div class="flex flex-wrap justify-end gap-2">
			<span class={getRiskLevelTone(brief.riskLevel)}>
				{getRiskLevelLabel(brief.riskLevel)}
			</span>
			<span class={getConfidenceTone(brief.confidence)}>
				{getConfidenceLabel(brief.confidence)}
			</span>
			<span class={getEvidenceTone(brief.evidenceStatus)}>
				{getEvidenceLabel(brief.evidenceStatus)}
			</span>
		</div>
	</div>

	<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">{brief.summary}</p>

	<div class="data-cell mt-4 text-sm text-[var(--text-muted-relaxed)]">
		{getEvidenceMessage(brief)}
	</div>

	{#if (brief.breakingChanges ?? []).length}
		<div class="mt-5">
			<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Cambios críticos</p>
			<ul class="mt-2 space-y-2 text-sm text-[var(--text-muted-relaxed)]">
				{#each brief.breakingChanges ?? [] as change}
					<li class="alert-box alert-box--red">{change}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if (brief.recommendedActions ?? []).length}
		<div class="mt-5">
			<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Acciones sugeridas</p>
			<ul class="mt-2 space-y-2 text-sm text-[var(--text-muted-relaxed)]">
				{#each brief.recommendedActions ?? [] as action}
					<li class="data-cell">{action}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if (brief.testFocus ?? []).length}
		<div class="mt-5">
			<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Foco de pruebas</p>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each brief.testFocus ?? [] as focus}
					<span class="neon-badge neon-badge--cyan">{focus}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if (brief.sources ?? []).length}
		<div class="mt-5">
			<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Fuentes</p>
			<div class="mt-2 grid gap-2">
				{#each brief.sources ?? [] as source}
					<a
						class="link-row"
						href={source.url}
						target="_blank"
						rel="noreferrer"
					>
						<span class="flex items-center gap-2">
							<span class="font-bold text-white">{formatSourceDescriptor(source)}</span>
							<span class="text-xs text-[var(--text-dim)]">{source.packageName}</span>
						</span>
						<span class="text-xs text-[var(--text-dim)]">abrir →</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</article>
