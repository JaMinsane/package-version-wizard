<script lang="ts">
	import { homeFlowSteps } from '$lib/ui/home/content';
</script>

<section class="terminal-window">
	<div class="terminal-bar">
		<div class="terminal-dots">
			<span class="terminal-dot terminal-dot--red"></span>
			<span class="terminal-dot terminal-dot--yellow"></span>
			<span class="terminal-dot terminal-dot--green"></span>
		</div>
		<span class="terminal-title">$ wizard --pipeline</span>
	</div>

	<div class="terminal-body">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="max-w-2xl">
				<p class="section-label">Flujo</p>
				<h2 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
					Una secuencia corta, una lectura más útil
				</h2>
				<p class="mt-3 text-sm leading-7 text-[var(--text-muted)] sm:text-base">
					La experiencia se enfoca en mostrar progreso, decisión y continuidad sin añadir pasos
					superfluos.
				</p>
			</div>
			<span class="neon-badge neon-badge--muted">SSR · server-first · URL compartible</span>
		</div>

		<div class="mt-8 grid gap-4 xl:grid-cols-3">
			{#each homeFlowSteps as step}
				<article class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5">
					<p class="text-xs font-bold uppercase tracking-[0.3em] text-[var(--neon-green)]" style="text-shadow: 0 0 8px rgba(15,255,106,0.3)">[{step.index}]</p>
					<h3 class="mt-4 text-xl font-bold text-white">{step.title}</h3>
					<p class="mt-3 text-sm leading-7 text-[var(--text-muted)]">{step.description}</p>
					<div class="data-cell mt-5">
						<p class="text-sm leading-7 text-[var(--text-muted)]">{step.detail}</p>
					</div>
				</article>
			{/each}
		</div>
	</div>
</section>
