<script lang="ts">
	import { homeHeroStats } from '$lib/ui/home/content';
</script>

<section class="terminal-window">
	<div class="terminal-bar">
		<div class="terminal-dots">
			<span class="terminal-dot terminal-dot--red"></span>
			<span class="terminal-dot terminal-dot--yellow"></span>
			<span class="terminal-dot terminal-dot--green"></span>
		</div>
		<span class="terminal-title">$ wizard --init</span>
	</div>

	<div class="terminal-body">
		<div class="grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
			<div class="max-w-3xl">
				<div class="flex flex-wrap items-center gap-3">
					<span class="neon-badge neon-badge--green">
						<span class="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"></span>
						Package Version Wizard
					</span>
					<span class="neon-badge neon-badge--muted">
						SvelteKit + n8n
					</span>
				</div>

				<h1 class="mt-6 max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-4xl xl:text-5xl">
					Convierte un <span class="text-[var(--neon-green)]" style="text-shadow: 0 0 20px rgba(15,255,106,0.4)">package.json</span> en una lectura
					clara de qué actualizar, qué probar y qué automatizar<span class="cursor-blink"></span>
				</h1>

				<p class="mt-6 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
					Una interfaz enfocada en operación: subes el manifiesto, obtienes señal priorizada del
					registry de npm y revisas un brief técnico para coordinar upgrades con más criterio.
				</p>
			</div>

			<div class="grid gap-4">
				{#each homeHeroStats as stat}
					<article class="data-cell">
						<p class="text-sm font-bold uppercase tracking-widest text-[var(--neon-green)]" style="text-shadow: 0 0 8px rgba(15,255,106,0.3)">{stat.value}</p>
						<h2 class="mt-3 text-lg font-semibold text-white">{stat.label}</h2>
						<p class="mt-2 text-sm leading-7 text-[var(--text-muted)]">{stat.description}</p>
					</article>
				{/each}
			</div>
		</div>
	</div>
</section>
