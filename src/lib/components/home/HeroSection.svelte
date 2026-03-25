<script lang="ts">
	import { homeHeroStats } from '$lib/ui/home/content';
</script>

<section class="surface-panel app-shell-glow overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
	<div class="grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
		<div class="max-w-3xl">
			<div class="flex flex-wrap items-center gap-3">
				<span class="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-cyan-100">
					<span class="inline-flex h-2 w-2 rounded-full bg-cyan-300"></span>
					Package Version Wizard
				</span>
				<span class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300">
					npm intelligence with SvelteKit + n8n
				</span>
			</div>

			<h1 class="mt-6 max-w-4xl text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl xl:text-6xl">
				Convierte un <span class="text-cyan-300">package.json</span> en una lectura clara de qué
				actualizar, qué probar y qué automatizar.
			</h1>

			<p class="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
				Una interfaz enfocada en operación: subes el manifiesto, obtienes señal priorizada del
				registry y revisas un brief listo para coordinar upgrades con más criterio.
			</p>
		</div>

		<div class="grid gap-4">
			{#each homeHeroStats as stat}
				<article class="surface-panel-muted rounded-[1.75rem] p-5">
					<p class="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/90">{stat.value}</p>
					<h2 class="mt-3 text-xl font-semibold text-white">{stat.label}</h2>
					<p class="mt-2 text-sm leading-7 text-slate-300">{stat.description}</p>
				</article>
			{/each}
		</div>
	</div>
</section>
