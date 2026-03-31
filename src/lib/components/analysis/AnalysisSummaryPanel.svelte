<script lang="ts">
	import type { AnalysisSnapshot } from '$lib/server/analysis/types';
	import { analysisStatusLabels } from '$lib/ui/analysis/helpers';

	interface Props {
		analysis: AnalysisSnapshot;
	}

	let { analysis }: Props = $props();
</script>

<section class="terminal-window">
	<div class="terminal-bar">
		<div class="terminal-dots">
			<span class="terminal-dot terminal-dot--red"></span>
			<span class="terminal-dot terminal-dot--yellow"></span>
			<span class="terminal-dot terminal-dot--green"></span>
		</div>
		<span class="terminal-title">$ cat brief.md</span>
	</div>

	<div class="terminal-body">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="section-label">Brief AI</p>
				<h2 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Resumen ejecutivo</h2>
			</div>
			{#if analysis.status === 'completed'}
				<span class="neon-badge neon-badge--green">Disponible</span>
			{/if}
		</div>

		{#if analysis.status === 'completed' && analysis.renderedSummaryHtml}
			<div class="mt-6 rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.6)] p-6">
				<div
					class="prose prose-invert max-w-none prose-headings:font-bold prose-p:text-[var(--text-primary)] prose-li:text-[var(--text-primary)] prose-strong:text-white prose-a:text-[var(--neon-green)]"
				>
					{@html analysis.renderedSummaryHtml}
				</div>
			</div>
		{:else if analysis.status === 'failed'}
			<div class="alert-box alert-box--red mt-6">
				<p class="text-base font-bold">El brief no se pudo completar</p>
				<p class="mt-2 text-sm leading-7 opacity-80">
					El análisis conserva el contexto técnico para diagnosticar el problema.
				</p>
			</div>
		{:else}
			<div class="mt-6 animate-pulse rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.4)] p-6">
				<div class="h-4 w-24 rounded bg-[var(--border-green)]"></div>
				<div class="mt-4 h-5 w-5/6 rounded bg-[var(--border-green)]"></div>
				<div class="mt-3 h-5 w-4/6 rounded bg-[var(--border-green)]"></div>
				<div class="mt-6 h-32 rounded-lg bg-[rgba(10,10,15,0.6)]"></div>
				<p class="mt-4 text-sm text-[var(--text-dim)]">{analysisStatusLabels[analysis.status]}</p>
			</div>
		{/if}

		{#if analysis.callbackPayload?.upgradePlan.length}
			<div class="mt-6 grid gap-4 lg:grid-cols-2">
				{#each analysis.callbackPayload.upgradePlan as phase}
					<article class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5">
						<span class="neon-badge neon-badge--cyan">Fase {phase.wave}</span>
						<h3 class="mt-3 text-lg font-bold text-white">{phase.title}</h3>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">{phase.rationale}</p>
						<div class="mt-4 flex flex-wrap gap-2">
							{#each phase.packages as packageName}
								<span class="neon-badge neon-badge--muted">
									{packageName}
								</span>
							{/each}
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>
