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
		isPolling: boolean;
		pollingError: string | null;
	}

	let { analysis, isPolling, pollingError }: Props = $props();
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
			<p class="section-label">Estado</p>
			<div class="mt-4 flex items-start justify-between gap-4">
				<div>
					<h2 class="text-xl font-bold text-white">{analysisStatusLabels[analysis.status]}</h2>
					<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">
						{analysisStatusDescriptions[analysis.status]}
					</p>
				</div>
				<span class={getStatusTone(analysis.status)}>
					{analysisStatusLabels[analysis.status]}
				</span>
			</div>

			<div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
				<div class="data-cell">
					<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">Creado</p>
					<p class="mt-2 text-sm text-[var(--text-primary)]">
						{formatTimestamp(analysis.createdAt)}
					</p>
				</div>
				<div class="data-cell">
					<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">Callback</p>
					<p class="mt-2 text-sm text-[var(--text-primary)]">
						{formatTimestamp(analysis.callbackReceivedAt)}
					</p>
				</div>
			</div>

			{#if isPolling}
				<div class="alert-box alert-box--cyan mt-5 flex items-center gap-3">
					<span
						class="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--neon-cyan)] shadow-[0_0_6px_var(--neon-cyan)]"
					></span>
					Consultando estado en segundo plano.
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
				<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">Webhook</p>
				<div class="mt-4 grid gap-4">
					<div>
						<p class="text-xs tracking-widest text-[var(--text-dim)] uppercase">Webhook HTTP</p>
						<p class="mt-2 text-sm font-bold text-white">
							{analysis.webhookResponse?.status ?? 'Pendiente'}
						</p>
					</div>
					<div>
						<p class="text-xs tracking-widest text-[var(--text-dim)] uppercase">
							Clave de idempotencia
						</p>
						<p class="mt-2 text-xs leading-6 break-all text-[var(--text-muted-relaxed-relaxed)]">
							{analysis.lastIdempotencyKey ?? 'Sin callback aún'}
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</aside>
