<script lang="ts">
	import { homeFlowSteps } from '$lib/ui/home/content';
</script>

<section class="surface-panel rounded-[2rem] p-6 sm:p-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="max-w-2xl">
			<p class="section-label">Flujo</p>
			<h2 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
				Una secuencia corta, una lectura más útil
			</h2>
			<p class="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
				La experiencia se enfoca en mostrar progreso, decisión y continuidad sin añadir pasos
				superfluos.
			</p>
		</div>
		<span class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300">
			SSR · server-first · URL compartible
		</span>
	</div>

	<div class="mt-8 grid gap-4 xl:grid-cols-3">
		{#each homeFlowSteps as step}
			<article class="rounded-[1.7rem] border border-white/10 bg-white/[0.03] p-5">
				<p class="font-mono text-xs uppercase tracking-[0.3em] text-cyan-200">{step.index}</p>
				<h3 class="mt-4 text-2xl font-semibold text-white">{step.title}</h3>
				<p class="mt-3 text-sm leading-7 text-slate-300">{step.description}</p>
				<div class="mt-5 rounded-[1.2rem] border border-white/8 bg-slate-950/45 p-4">
					<p class="text-sm leading-7 text-slate-300">{step.detail}</p>
				</div>
			</article>
		{/each}
	</div>
</section>
