<script lang="ts">
	import type { AnalysisSnapshot } from '$lib/server/analysis/types';
	import { analysisStatusLabels } from '$lib/ui/analysis/helpers';

	interface Props {
		analysis: AnalysisSnapshot;
	}

	let { analysis }: Props = $props();
</script>

<section class="surface-panel rounded-[2rem] p-6 sm:p-8">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<p class="section-label">Brief AI</p>
			<h2 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Resumen ejecutivo</h2>
		</div>
		{#if analysis.status === 'completed'}
			<span class="rounded-full border border-emerald-400/20 bg-emerald-400/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
				Listo para revisar
			</span>
		{/if}
	</div>

	{#if analysis.status === 'completed' && analysis.renderedSummaryHtml}
		<div class="mt-6 rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-6">
			<div
				class="prose prose-invert max-w-none prose-headings:font-semibold prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-a:text-cyan-200"
			>
				{@html analysis.renderedSummaryHtml}
			</div>
		</div>
	{:else if analysis.status === 'failed'}
		<div class="mt-6 rounded-[1.8rem] border border-rose-400/20 bg-rose-400/10 p-6">
			<p class="text-lg font-semibold text-rose-100">El brief no se pudo completar.</p>
			<p class="mt-2 text-sm leading-7 text-rose-50/90">
				La corrida conserva el contexto técnico disponible para depurar el problema sin perder el
				rastro del análisis.
			</p>
		</div>
	{:else}
		<div class="mt-6 animate-pulse rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-6">
			<div class="h-4 w-24 rounded-full bg-white/10"></div>
			<div class="mt-4 h-5 w-5/6 rounded-full bg-white/10"></div>
			<div class="mt-3 h-5 w-4/6 rounded-full bg-white/10"></div>
			<div class="mt-6 h-32 rounded-[1.5rem] bg-slate-950/45"></div>
			<p class="mt-4 text-sm text-slate-400">{analysisStatusLabels[analysis.status]}</p>
		</div>
	{/if}

	{#if analysis.callbackPayload?.upgradePlan.length}
		<div class="mt-6 grid gap-4 lg:grid-cols-2">
			{#each analysis.callbackPayload.upgradePlan as phase}
				<article class="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-5">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
						Fase {phase.wave}
					</p>
					<h3 class="mt-3 text-xl font-semibold text-white">{phase.title}</h3>
					<p class="mt-3 text-sm leading-7 text-slate-300">{phase.rationale}</p>
					<div class="mt-4 flex flex-wrap gap-2">
						{#each phase.packages as packageName}
							<span class="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
								{packageName}
							</span>
						{/each}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
