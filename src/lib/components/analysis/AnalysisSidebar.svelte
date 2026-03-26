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
	<section class="terminal-window">
		<div class="terminal-bar">
			<div class="terminal-dots">
				<span class="terminal-dot terminal-dot--red"></span>
				<span class="terminal-dot terminal-dot--yellow"></span>
				<span class="terminal-dot terminal-dot--green"></span>
			</div>
			<span class="terminal-title">$ status</span>
		</div>
		<div class="terminal-body">
			<p class="section-label">Progreso</p>
			<div class="mt-4 flex items-start justify-between gap-4">
				<div>
					<h2 class="text-xl font-bold text-white">{analysisStatusLabels[analysis.status]}</h2>
					<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">{analysisStatusDescriptions[analysis.status]}</p>
				</div>
				<span class={getStatusTone(analysis.status)}>
					{analysisStatusLabels[analysis.status]}
				</span>
			</div>

			<div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
				<div class="data-cell">
					<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Creado</p>
					<p class="mt-2 text-sm text-[var(--text-primary)]">{formatTimestamp(analysis.createdAt)}</p>
				</div>
				<div class="data-cell">
					<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Callback</p>
					<p class="mt-2 text-sm text-[var(--text-primary)]">{formatTimestamp(analysis.callbackReceivedAt)}</p>
				</div>
			</div>

			{#if isPolling}
				<div class="alert-box alert-box--cyan mt-5 flex items-center gap-3">
					<span class="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--neon-cyan)] shadow-[0_0_6px_var(--neon-cyan)]"></span>
					La página sigue consultando el estado automáticamente.
				</div>
			{/if}

			{#if pollingError}
				<div class="alert-box alert-box--red mt-4">
					{pollingError}
				</div>
			{/if}

			{#if analysis.errorMessage}
				<div class="alert-box alert-box--red mt-4">
					{analysis.errorMessage}
				</div>
			{/if}

			<div class="mt-6 rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.6)] p-5">
				<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Webhook</p>
				<div class="mt-4 grid gap-4">
					<div>
						<p class="text-xs uppercase tracking-widest text-[var(--text-dim)]">Webhook HTTP</p>
						<p class="mt-2 text-sm font-bold text-white">
							{analysis.webhookResponse?.status ?? 'Pendiente'}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-widest text-[var(--text-dim)]">Clave de idempotencia</p>
						<p class="mt-2 break-all text-xs leading-6 text-[var(--text-muted-relaxed-relaxed)]">
							{analysis.lastIdempotencyKey ?? 'Aún no llegó callback'}
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="terminal-window">
		<div class="terminal-bar">
			<div class="terminal-dots">
				<span class="terminal-dot terminal-dot--red"></span>
				<span class="terminal-dot terminal-dot--yellow"></span>
				<span class="terminal-dot terminal-dot--green"></span>
			</div>
			<span class="terminal-title">$ radar --config</span>
		</div>
		<div class="terminal-body">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="section-label">Automatización</p>
					<h2 class="mt-3 text-xl font-bold text-white">Radar continuo</h2>
				</div>
				{#if analysis.subscription?.enabled}
					<span class="neon-badge neon-badge--green">Activo</span>
				{/if}
			</div>

			<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">
				Conecta este proyecto a Slack para seguir recibiendo cambios relevantes sin volver a subir el
				manifiesto.
			</p>

			<form method="POST" action="?/saveSlackSubscription" class="mt-6 space-y-4">
				<label class="neon-badge neon-badge--green cursor-pointer">
					<input
						name="enabled"
						type="checkbox"
						class="rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
						checked={analysis.subscription?.enabled ?? false}
					/>
					Activar radar por Slack
				</label>

				<div class="grid gap-4">
					<label class="block">
						<span class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">
							Canal o destino
						</span>
						<input
							name="channelTarget"
							type="text"
							placeholder="#platform-upgrades"
							value={analysis.subscription?.channelTarget ?? ''}
							class="mt-2 w-full"
						/>
					</label>

					<label class="block">
						<span class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">
							Frecuencia
						</span>
						<select
							name="frequency"
							class="mt-2 w-full"
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
					class="neon-button w-full"
				>
					[ GUARDAR AUTOMATIZACIÓN ]
				</button>
			</form>

			{#if formMessage}
				<div class="alert-box alert-box--green mt-4">
					{formMessage}
				</div>
			{/if}

			{#if !radarReady}
				<div class="alert-box alert-box--amber mt-4">
					Falta configurar `APP_BASE_URL` o `N8N_INTERNAL_API_TOKEN` para habilitar el radar
					continuo de punta a punta.
				</div>
			{/if}
		</div>
	</section>
</aside>
