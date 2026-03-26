<script lang="ts">
	import type { AnalysisSnapshot } from '$lib/server/analysis/types';
	import { analysisStatusLabels, getStatusTone } from '$lib/ui/analysis/helpers';

	interface Props {
		analysis: AnalysisSnapshot;
		shareUrl?: string;
	}

	let { analysis, shareUrl }: Props = $props();
</script>

<section class="terminal-window">
	<div class="terminal-bar">
		<div class="terminal-dots">
			<span class="terminal-dot terminal-dot--red"></span>
			<span class="terminal-dot terminal-dot--yellow"></span>
			<span class="terminal-dot terminal-dot--green"></span>
		</div>
		<span class="terminal-title">$ wizard --analyze {analysis.project.name}</span>
	</div>

	<div class="terminal-body">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="max-w-3xl">
				<a
					href="/"
					class="neon-badge neon-badge--muted transition-all hover:border-[rgba(15,255,106,0.3)] hover:text-[var(--neon-green)]"
				>
					← Volver al inicio
				</a>

				<p class="section-label mt-6">Corrida persistida</p>
				<h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
					{analysis.project.name}
				</h1>
				<p class="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)] sm:text-base">
					{analysis.manifestName ?? 'package.json'}
					{#if analysis.manifestVersion}
						<span class="mx-2 text-[var(--text-dim)]">·</span>
						v{analysis.manifestVersion}
					{/if}
					<span class="mx-2 text-[var(--text-dim)]">·</span>
					{analysis.stats.total} dependencias detectadas
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				{#if shareUrl}
					<a
						href={shareUrl}
						target="_blank"
						rel="noreferrer"
						class="neon-badge neon-badge--muted transition-all hover:border-[rgba(15,255,106,0.3)] hover:text-[var(--neon-green)]"
					>
						Abrir URL pública
					</a>
				{/if}

				<span class={getStatusTone(analysis.status)}>
					{analysisStatusLabels[analysis.status]}
				</span>
			</div>
		</div>

		<div class="mt-8 grid gap-4 lg:grid-cols-4">
			<div class="data-cell">
				<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Pendientes</p>
				<p class="mt-3 text-2xl font-bold text-white">{analysis.stats.outdated}</p>
			</div>
			<div class="data-cell">
				<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Cambios major</p>
				<p class="mt-3 text-2xl font-bold text-white">{analysis.stats.majors}</p>
			</div>
			<div class="data-cell">
				<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Minor + patch</p>
				<p class="mt-3 text-2xl font-bold text-white">
					{analysis.stats.minors + analysis.stats.patches}
				</p>
			</div>
			<div class="data-cell">
				<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Deprecated</p>
				<p class="mt-3 text-2xl font-bold text-[var(--neon-red)]" style="text-shadow: 0 0 8px rgba(255,51,102,0.3)">{analysis.stats.deprecated}</p>
			</div>
		</div>
	</div>
</section>
