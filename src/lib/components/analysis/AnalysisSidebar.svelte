<script lang="ts">
	import type { AnalysisSnapshot } from '$lib/server/analysis/types';
	import {
		analysisStatusDescriptions,
		analysisStatusLabels,
		formatTimestamp,
		getStatusTone
	} from '$lib/ui/analysis/helpers';

	interface Props {
		analysis: AnalysisSnapshot;
		formMessage?: string;
		isPolling: boolean;
		pollingError: string | null;
		radarReady: boolean;
	}

	let { analysis, formMessage, isPolling, pollingError, radarReady }: Props = $props();
</script>

<aside class="space-y-6">
	<section class="surface-panel rounded-[2rem] p-6">
		<p class="section-label">Progreso</p>
		<div class="mt-4 flex items-start justify-between gap-4">
			<div>
				<h2 class="text-2xl font-semibold text-white">{analysisStatusLabels[analysis.status]}</h2>
				<p class="mt-3 text-sm leading-7 text-slate-300">{analysisStatusDescriptions[analysis.status]}</p>
			</div>
			<span class={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(analysis.status)}`}>
				{analysisStatusLabels[analysis.status]}
			</span>
		</div>

		<div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
			<div class="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Creado</p>
				<p class="mt-2 text-sm text-slate-200">{formatTimestamp(analysis.createdAt)}</p>
			</div>
			<div class="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
				<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Callback</p>
				<p class="mt-2 text-sm text-slate-200">{formatTimestamp(analysis.callbackReceivedAt)}</p>
			</div>
		</div>

		{#if isPolling}
			<div class="mt-5 flex items-center gap-3 rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
				<span class="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300"></span>
				La página sigue consultando el estado automáticamente.
			</div>
		{/if}

		{#if pollingError}
			<div class="mt-4 rounded-[1.2rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
				{pollingError}
			</div>
		{/if}

		{#if analysis.errorMessage}
			<div class="mt-4 rounded-[1.2rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
				{analysis.errorMessage}
			</div>
		{/if}

		<div class="mt-6 rounded-[1.6rem] border border-white/10 bg-slate-950/45 p-5">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Webhook</p>
			<div class="mt-4 grid gap-4">
				<div>
					<p class="text-xs uppercase tracking-[0.18em] text-slate-500">Webhook HTTP</p>
					<p class="mt-2 text-sm font-semibold text-white">
						{analysis.webhookResponse?.status ?? 'Pendiente'}
					</p>
				</div>
				<div>
					<p class="text-xs uppercase tracking-[0.18em] text-slate-500">Clave de idempotencia</p>
					<p class="mt-2 break-all font-mono text-xs leading-6 text-slate-300">
						{analysis.lastIdempotencyKey ?? 'Aún no llegó callback'}
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="surface-panel rounded-[2rem] p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="section-label">Automatización</p>
				<h2 class="mt-3 text-2xl font-semibold text-white">Radar continuo</h2>
			</div>
			{#if analysis.subscription?.enabled}
				<span class="rounded-full border border-emerald-400/20 bg-emerald-400/12 px-3 py-1 text-xs font-semibold text-emerald-100">
					Activo
				</span>
			{/if}
		</div>

		<p class="mt-3 text-sm leading-7 text-slate-300">
			Conecta este proyecto a Slack para seguir recibiendo cambios relevantes sin volver a subir el
			manifiesto.
		</p>

		<form method="POST" action="?/saveSlackSubscription" class="mt-6 space-y-4">
			<label class="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200">
				<input
					name="enabled"
					type="checkbox"
					class="rounded border-white/20 bg-slate-950/30 text-cyan-300 focus:ring-cyan-300"
					checked={analysis.subscription?.enabled ?? false}
				/>
				Activar radar por Slack
			</label>

			<div class="grid gap-4">
				<label class="block">
					<span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
						Canal o destino
					</span>
					<input
						name="channelTarget"
						type="text"
						placeholder="#platform-upgrades"
						value={analysis.subscription?.channelTarget ?? ''}
						class="mt-2 w-full rounded-[1.1rem] border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white placeholder:text-slate-500"
					/>
				</label>

				<label class="block">
					<span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
						Frecuencia
					</span>
					<select
						name="frequency"
						class="mt-2 w-full rounded-[1.1rem] border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white"
					>
						<option value="daily" selected={(analysis.subscription?.frequency ?? 'daily') === 'daily'}>
							Diario
						</option>
						<option value="weekdays" selected={analysis.subscription?.frequency === 'weekdays'}>
							Lunes a viernes
						</option>
						<option value="twice_daily" selected={analysis.subscription?.frequency === 'twice_daily'}>
							Dos veces al día
						</option>
					</select>
				</label>
			</div>

			<button
				type="submit"
				class="inline-flex w-full items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
			>
				Guardar automatización
			</button>
		</form>

		{#if formMessage}
			<div class="mt-4 rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
				{formMessage}
			</div>
		{/if}

		{#if !radarReady}
			<div class="mt-4 rounded-[1.2rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
				Falta configurar `APP_BASE_URL` o `N8N_INTERNAL_API_TOKEN` para habilitar el radar
				continuo de punta a punta.
			</div>
		{/if}
	</section>
</aside>
