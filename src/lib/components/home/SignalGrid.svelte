<script lang="ts">
	import { homeOutputCards, homeStoryCards } from '$lib/ui/home/content';

	function getAccentClass(accent: 'cyan' | 'violet' | 'amber' | 'emerald') {
		return {
			cyan: 'border-[rgba(0,229,255,0.2)] shadow-[inset_0_0_30px_rgba(0,229,255,0.04)]',
			violet: 'border-[rgba(191,90,242,0.2)] shadow-[inset_0_0_30px_rgba(191,90,242,0.04)]',
			amber: 'border-[rgba(255,170,0,0.2)] shadow-[inset_0_0_30px_rgba(255,170,0,0.04)]',
			emerald: 'border-[rgba(15,255,106,0.2)] shadow-[inset_0_0_30px_rgba(15,255,106,0.04)]'
		}[accent];
	}

	function getAccentBadge(accent: 'cyan' | 'violet' | 'amber' | 'emerald') {
		return {
			cyan: 'neon-badge--cyan',
			violet: 'neon-badge--violet',
			amber: 'neon-badge--amber',
			emerald: 'neon-badge--green'
		}[accent];
	}
</script>

<section id="signals" class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
	<div class="terminal-window">
		<div class="terminal-bar">
			<div class="terminal-dots">
				<span class="terminal-dot terminal-dot--red"></span>
				<span class="terminal-dot terminal-dot--yellow"></span>
				<span class="terminal-dot terminal-dot--green"></span>
			</div>
			<span class="terminal-title">$ cat signals.log</span>
		</div>
		<div class="terminal-body">
			<p class="section-label">Qué se obtiene</p>
			<h2 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
				Información clara antes de tocar código
			</h2>
			<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)] sm:text-base">
				El análisis organiza las dependencias por prioridad para que sepas qué mover primero.
			</p>

			<div class="mt-6 grid gap-4">
				{#each homeStoryCards as card}
					<article
						class={`rounded-lg border bg-[rgba(10,10,15,0.5)] p-5 ${getAccentClass(card.accent)}`}
					>
						<span class={`neon-badge ${getAccentBadge(card.accent)}`}>{card.eyebrow}</span>
						<h3 class="mt-3 text-lg font-bold text-white">{card.title}</h3>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
							{card.description}
						</p>
					</article>
				{/each}
			</div>
		</div>
	</div>

	<div class="terminal-window">
		<div class="terminal-bar">
			<div class="terminal-dots">
				<span class="terminal-dot terminal-dot--red"></span>
				<span class="terminal-dot terminal-dot--yellow"></span>
				<span class="terminal-dot terminal-dot--green"></span>
			</div>
			<span class="terminal-title">$ wizard --output</span>
		</div>
		<div class="terminal-body">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="section-label">Resultados</p>
					<h2 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
						Una salida preparada para operar
					</h2>
				</div>
				<span class="neon-badge neon-badge--muted"> Brief AI + dependencias + fuentes </span>
			</div>

			<div class="mt-6 grid gap-4 md:grid-cols-3">
				{#each homeOutputCards as card}
					<article
						class={`rounded-lg border bg-[rgba(10,10,15,0.5)] p-5 ${getAccentClass(card.accent)}`}
					>
						<span class={`neon-badge ${getAccentBadge(card.accent)}`}>{card.eyebrow}</span>
						<h3 class="mt-3 text-base font-bold text-white">{card.title}</h3>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
							{card.description}
						</p>
					</article>
				{/each}
			</div>

			<div class="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
				<div class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.6)] p-5">
					<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
						Pantalla de análisis
					</p>
					<div class="mt-4 grid gap-3">
						<div class="data-cell">
							<p class="text-sm font-bold text-white">Brief ejecutivo</p>
							<p class="mt-2 text-sm leading-7 text-[var(--text-muted-relaxed)]">
								Resumen AI en Markdown con las prioridades del upgrade.
							</p>
						</div>
						<div class="data-cell">
							<p class="text-sm font-bold text-white">Dependencias priorizadas</p>
							<p class="mt-2 text-sm leading-7 text-[var(--text-muted-relaxed)]">
								Ve qué requiere cambio real y qué ya cubre el rango declarado.
							</p>
						</div>
					</div>
				</div>

				<div class="rounded-lg border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.04)] p-5">
					<span class="neon-badge neon-badge--cyan">Slack</span>
					<h3 class="mt-3 text-lg font-bold text-white">
						Slack solo entra al final.
					</h3>
					<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
						Primero el análisis, después la notificación. Slack recibe el brief y el link del analisis cuando
						ya hay algo útil que compartir.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>
