<script lang="ts">
	import { homeOutputCards, homeStoryCards } from '$lib/ui/home/content';

	function getAccentClasses(accent: 'cyan' | 'violet' | 'amber' | 'emerald') {
		return {
			cyan: 'border-cyan-400/15 bg-cyan-400/8',
			violet: 'border-violet-400/15 bg-violet-400/8',
			amber: 'border-amber-400/15 bg-amber-400/8',
			emerald: 'border-emerald-400/15 bg-emerald-400/8'
		}[accent];
	}
</script>

<section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
	<div class="surface-panel rounded-[2rem] p-6 sm:p-8">
		<p class="section-label">Qué se obtiene</p>
		<h2 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
			Señal útil antes de ejecutar cambios
		</h2>
		<p class="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
			La interfaz organiza el resultado para que el equipo vea valor rápido sin perder trazabilidad
			técnica.
		</p>

		<div class="mt-6 grid gap-4">
			{#each homeStoryCards as card}
				<article class={`rounded-[1.5rem] border p-5 ${getAccentClasses(card.accent)}`}>
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">{card.eyebrow}</p>
					<h3 class="mt-3 text-xl font-semibold text-white">{card.title}</h3>
					<p class="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
				</article>
			{/each}
		</div>
	</div>

	<div class="surface-panel rounded-[2rem] p-6 sm:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="section-label">Resultados</p>
				<h2 class="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
					Una salida preparada para operar
				</h2>
			</div>
			<span class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300">
				Resumen + dependencias + evidencia
			</span>
		</div>

		<div class="mt-6 grid gap-4 md:grid-cols-3">
			{#each homeOutputCards as card}
				<article class={`rounded-[1.5rem] border p-5 ${getAccentClasses(card.accent)}`}>
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">{card.eyebrow}</p>
					<h3 class="mt-3 text-lg font-semibold text-white">{card.title}</h3>
					<p class="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
				</article>
			{/each}
		</div>

		<div class="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
			<div class="rounded-[1.6rem] border border-white/10 bg-slate-950/45 p-5">
				<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Vista principal</p>
				<div class="mt-4 grid gap-3">
					<div class="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
						<p class="text-sm font-semibold text-white">Brief ejecutivo</p>
						<p class="mt-2 text-sm leading-7 text-slate-300">
							Resumen renderizado desde Markdown con una lectura clara para priorizar el trabajo.
						</p>
					</div>
					<div class="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
						<p class="text-sm font-semibold text-white">Prioridades y dependencias</p>
						<p class="mt-2 text-sm leading-7 text-slate-300">
							Las tarjetas resaltan lo que requiere cambio ahora y lo que ya cubre el rango
							declarado.
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-[1.6rem] border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(34,211,238,0.04))] p-5">
				<p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Automatización</p>
				<h3 class="mt-3 text-xl font-semibold text-white">
					El radar no compite con la lectura, la extiende.
				</h3>
				<p class="mt-3 text-sm leading-7 text-slate-300">
					La configuración de Slack permanece disponible cuando quieres activar seguimiento
					continuo, pero sin desplazar el análisis central.
				</p>
			</div>
		</div>
	</div>
</section>
