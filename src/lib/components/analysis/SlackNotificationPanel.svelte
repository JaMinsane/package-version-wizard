<script lang="ts">
	import type { AnalysisSnapshot } from '$lib/server/analysis/types';
	import { formatTimestamp } from '$lib/ui/analysis/helpers';

	interface Props {
		analysis: AnalysisSnapshot;
	}

	let { analysis }: Props = $props();
</script>

<section class="terminal-window">
	<div class="terminal-bar">
		<div class="terminal-dots">
			<span class="terminal-dot terminal-dot--red"></span>
			<span class="terminal-dot terminal-dot--yellow"></span>
			<span class="terminal-dot terminal-dot--green"></span>
		</div>
		<span class="terminal-title">$ slack --notify</span>
	</div>
	<div class="terminal-body">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="section-label">Slack</p>
				<h2 class="mt-3 text-xl font-bold text-white">Notificación final</h2>
			</div>
			{#if analysis.slackNotification}
				<span
					class={analysis.slackNotification.status === 'sent'
						? 'neon-badge neon-badge--green'
						: analysis.slackNotification.status === 'failed'
							? 'neon-badge neon-badge--red'
							: 'neon-badge neon-badge--muted'}
				>
					{analysis.slackNotification.status}
				</span>
			{:else}
				<span class="neon-badge neon-badge--muted">sin envío</span>
			{/if}
		</div>

		<div class="mt-6 grid gap-3 sm:grid-cols-2">
			<div class="data-cell">
				<p class="text-xs tracking-widest text-[var(--text-dim)] uppercase">Canal objetivo</p>
				<p class="mt-2 text-sm text-white">
					{analysis.slackNotification?.channelName ??
						analysis.requestPayload.notificationContext?.slack?.channelName ??
						'No configurado'}
				</p>
			</div>
			<div class="data-cell">
				<p class="text-xs tracking-widest text-[var(--text-dim)] uppercase">Último intento</p>
				<p class="mt-2 text-sm text-white">
					{formatTimestamp(analysis.slackNotification?.notifiedAt) ?? 'Pendiente'}
				</p>
			</div>
		</div>
	</div>
</section>
