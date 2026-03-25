<script lang="ts">
	import type { AnalysisSnapshot } from '$lib/server/analysis/types';
	import { analysisStatusLabels, getStatusTone } from '$lib/ui/analysis/helpers';

	interface Props {
		analysis: AnalysisSnapshot;
		shareUrl?: string;
	}

	let { analysis, shareUrl }: Props = $props();
</script>

<section class="surface-panel rounded-[2rem] p-6 sm:p-8">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="max-w-3xl">
			<a
				href="/"
				class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/25 hover:bg-white/8"
			>
				Volver al inicio
			</a>

			<p class="section-label mt-6">Corrida persistida</p>
			<h1 class="mt-3 text-3xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
				{analysis.project.name}
			</h1>
			<p class="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
				{analysis.manifestName ?? 'package.json'}
				{#if analysis.manifestVersion}
					<span class="mx-2 text-slate-600">•</span>
					v{analysis.manifestVersion}
				{/if}
				<span class="mx-2 text-slate-600">•</span>
				{analysis.stats.total} dependencias detectadas
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			{#if shareUrl}
				<a
					href={shareUrl}
					target="_blank"
					rel="noreferrer"
					class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-cyan-300/25 hover:bg-white/8"
				>
					Abrir URL pública
				</a>
			{/if}

			<span
				class={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${getStatusTone(analysis.status)}`}
			>
				{analysisStatusLabels[analysis.status]}
			</span>
		</div>
	</div>

	<div class="mt-8 grid gap-4 lg:grid-cols-4">
		<div class="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pendientes</p>
			<p class="mt-3 text-3xl font-semibold text-white">{analysis.stats.outdated}</p>
		</div>
		<div class="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cambios major</p>
			<p class="mt-3 text-3xl font-semibold text-white">{analysis.stats.majors}</p>
		</div>
		<div class="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Minor + patch</p>
			<p class="mt-3 text-3xl font-semibold text-white">
				{analysis.stats.minors + analysis.stats.patches}
			</p>
		</div>
		<div class="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Deprecated</p>
			<p class="mt-3 text-3xl font-semibold text-white">{analysis.stats.deprecated}</p>
		</div>
	</div>
</section>
