<script lang="ts">
	import type { AnalysisSnapshot } from '$lib/server/analysis/types';
	import type { AnalysisSlackPanelData } from '$lib/server/slack/types';
	import {
		analysisStatusDescriptions,
		analysisStatusLabels,
		formatTimestamp,
		getStatusTone
	} from '$lib/ui/analysis/helpers';

	interface Props {
		analysis: AnalysisSnapshot;
		formSuccessMessage?: string;
		formErrorMessage?: string;
		isPolling: boolean;
		pollingError: string | null;
		slack: AnalysisSlackPanelData;
	}

	let { analysis, formSuccessMessage, formErrorMessage, isPolling, pollingError, slack }: Props =
		$props();

	let inheritUserDefaults = $state(true);
	let projectChannelId = $state('');
	let projectNotifyOnSuccess = $state(false);
	let projectNotifyOnFailure = $state(false);
	let projectNotificationsPaused = $derived(!projectNotifyOnSuccess && !projectNotifyOnFailure);

	$effect(() => {
		inheritUserDefaults = slack.projectSettings?.inheritUserDefaults ?? true;
		const baseSettings =
			slack.projectSettings && !slack.projectSettings.inheritUserDefaults
				? slack.projectSettings
				: (slack.effectiveSettings ?? slack.userDefaults);

		projectChannelId = baseSettings?.channelId ?? '';
		projectNotifyOnSuccess = baseSettings?.notifyOnSuccess ?? false;
		projectNotifyOnFailure = baseSettings?.notifyOnFailure ?? false;
	});
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

			<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">
				El backend envía el mensaje final con estado, métricas, digest corto y link al análisis.
			</p>

			<div class="mt-6 grid gap-3">
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
						{formatTimestamp(analysis.slackNotification?.notifiedAt)}
					</p>
				</div>
				{#if analysis.slackNotification?.reason}
					<div class="data-cell">
						<p class="text-xs tracking-widest text-[var(--text-dim)] uppercase">Detalle</p>
						<p class="mt-2 text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">
							{analysis.slackNotification.reason}
						</p>
					</div>
				{/if}
			</div>

			{#if slack.canManage}
				<form method="POST" action="?/saveProjectSlackSettings" class="mt-6 space-y-4">
					<label class="neon-badge neon-badge--cyan cursor-pointer">
						<input
							name="inheritUserDefaults"
							type="checkbox"
							bind:checked={inheritUserDefaults}
							class="rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
						/>
						Usar defaults de mi usuario
					</label>

					{#if inheritUserDefaults}
						<div class="alert-box alert-box--cyan">
							Usando la configuración global de
							<a href="/settings/integrations/slack" class="underline decoration-dotted">
								Slack
							</a>.
						</div>
					{:else}
						<div
							class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.48)] p-4"
						>
							<div class="flex flex-wrap items-center gap-3">
								<p class="text-sm font-bold text-white">
									{projectNotificationsPaused
										? 'Notificaciones de este proyecto en pausa'
										: 'Notificaciones de este proyecto activas'}
								</p>
								<span
									class={projectNotificationsPaused
										? 'neon-badge neon-badge--muted'
										: 'neon-badge neon-badge--green'}
								>
									{projectNotificationsPaused ? 'en pausa' : 'activo'}
								</span>
							</div>
							<p class="mt-2 text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">
								Si apagas ambos eventos, este proyecto deja de publicar en Slack sin perder el canal
								guardado.
							</p>
						</div>

						<div class="grid gap-4">
							<label class="block">
								<span class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
									Canal del proyecto
								</span>
								<select
									name="channelId"
									class="mt-2 w-full"
									bind:value={projectChannelId}
									disabled={!slack.channels.length}
								>
									<option value="">Selecciona un canal</option>
									{#each slack.channels as channel}
										<option value={channel.id}>
											{channel.isPrivate ? '[privado] ' : '#'}{channel.name}
										</option>
									{/each}
								</select>
							</label>

							<div class="grid gap-2 sm:grid-cols-2">
								<label class="slack-toggle-chip">
									<input
										name="notifyOnSuccess"
										type="checkbox"
										bind:checked={projectNotifyOnSuccess}
										class="m-0 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
									/>
									Al completar
								</label>
								<label class="slack-toggle-chip">
									<input
										name="notifyOnFailure"
										type="checkbox"
										bind:checked={projectNotifyOnFailure}
										class="m-0 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
									/>
									Al fallar
								</label>
							</div>
							<p class="text-sm leading-7 text-[var(--text-muted-relaxed-relaxed)]">
								Si activas alguno de estos eventos, debes elegir un canal para este proyecto.
							</p>
						</div>
					{/if}

					<button type="submit" class="neon-button w-full"> [ GUARDAR CONFIGURACIÓN ] </button>
				</form>

				{#if formSuccessMessage}
					<div class="alert-box alert-box--green mt-4">
						{formSuccessMessage}
					</div>
				{:else if formErrorMessage}
					<div class="alert-box alert-box--red mt-4">
						{formErrorMessage}
					</div>
				{/if}

				{#if !slack.workspace}
					<div class="alert-box alert-box--amber mt-4">
						Conecta Slack en <a
							href="/settings/integrations/slack"
							class="underline decoration-dotted">settings</a
						>
						para activar notificaciones.
					</div>
				{/if}
			{:else}
				<div class="alert-box alert-box--cyan mt-6">
					Solo el owner autenticado puede gestionar la configuración de Slack de este proyecto.
				</div>
			{/if}
		</div>
	</section>
</aside>
