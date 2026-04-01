<script lang="ts">
	import { page } from '$app/stores';
	import slackLogo from '$lib/assets/slack-logo.svg';
	import SlackHighlightsLimitField from '$lib/components/slack/SlackHighlightsLimitField.svelte';

	import type { ActionData, PageData } from './$types';

	let {
		data,
		form
	}: {
		data: PageData;
		form: ActionData;
	} = $props();

	let enabled = $state(false);
	let includeTopPackages = $state(true);

	$effect(() => {
		enabled = data.slack.defaults.enabled;
		includeTopPackages = data.slack.defaults.includeTopPackages;
	});
</script>

<svelte:head>
	<title>Slack | Package Version Wizard</title>
	<meta name="description" content="Conecta Slack y configura las notificaciones de análisis." />
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<!-- Status alerts -->
		{#if $page.url.searchParams.get('slack') === 'connected'}
			{#if data.slack.workspace?.n8nSyncStatus === 'synced'}
				<div class="alert-box alert-box--green">
					Slack conectado. Credencial sincronizada con n8n.
				</div>
			{:else}
				<div class="alert-box alert-box--amber">
					Slack conectado, pero la credencial aún no quedó sincronizada con n8n.
				</div>
			{/if}
		{:else if $page.url.searchParams.get('slack') === 'connected-sync-error'}
			<div class="alert-box alert-box--amber">
				Slack conectado, pero la sincronización de la credencial con n8n falló.
			</div>
		{:else if $page.url.searchParams.get('slack') === 'connect-error'}
			<div class="alert-box alert-box--red">La instalación o sincronización con n8n falló.</div>
		{:else if $page.url.searchParams.get('slack') === 'denied'}
			<div class="alert-box alert-box--amber">La instalación fue cancelada desde Slack.</div>
		{:else if $page.url.searchParams.get('slack') === 'invalid-state'}
			<div class="alert-box alert-box--red">
				No se pudo validar el retorno de Slack. Intenta de nuevo.
			</div>
		{/if}

		{#if form?.successMessage}
			<div class="alert-box alert-box--green">{form.successMessage}</div>
		{:else if form?.errorMessage}
			<div class="alert-box alert-box--red">{form.errorMessage}</div>
		{/if}

		<!-- Connect section -->
		<section class="terminal-window">
			<div class="terminal-bar">
				<div class="terminal-dots">
					<span class="terminal-dot terminal-dot--red"></span>
					<span class="terminal-dot terminal-dot--yellow"></span>
					<span class="terminal-dot terminal-dot--green"></span>
				</div>
				<span class="terminal-title">$ integrations --slack</span>
			</div>

			<div class="terminal-body">
				<div class="flex flex-wrap items-start justify-between gap-6">
					<div>
						<p class="section-label">Integración</p>
						<h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Slack</h1>
					</div>

					<div class="flex items-center gap-3">
						{#if data.slack.workspace}
							<span class="neon-badge neon-badge--green">
								<span
									class="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"
								></span>
								{data.slack.workspace.teamName}
							</span>
						{:else}
							<span class="neon-badge neon-badge--amber">Sin workspace</span>
						{/if}
					</div>
				</div>

				<div
					class="mt-6 rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.45)] p-6"
				>
					{#if data.slack.workspace}
						<div class="slack-connection-state">
							<div class="flex items-start gap-4">
								<img src={slackLogo} alt="Slack" class="mt-0.5 h-8 w-8" />
								<div>
									<p class="text-sm font-bold text-white">
										{data.slack.workspace.n8nSyncStatus === 'synced'
											? 'Workspace conectado'
											: 'Workspace conectado con atención pendiente'}
									</p>
									<p class="mt-1 text-xs leading-6 text-[var(--text-muted-relaxed)]">
										{data.slack.workspace.n8nSyncStatus === 'synced'
											? 'Slack y n8n ya quedaron listos para usar estos defaults.'
											: 'La instalación existe, pero aún necesitas completar la sincronización con n8n.'}
									</p>
								</div>
							</div>

							{#if data.slack.workspace.n8nSyncStatus !== 'synced' && data.slack.installReady}
								<a
									href="/settings/integrations/slack/connect"
									target="_blank"
									rel="noopener noreferrer"
									class="slack-inline-link"
								>
									Volver a autorizar
								</a>
							{/if}
						</div>
					{:else if data.slack.installReady}
						<a
							href="/settings/integrations/slack/connect"
							target="_blank"
							rel="noopener noreferrer"
							class="slack-install-button"
						>
							<img src={slackLogo} alt="Slack" class="h-6 w-6" />
							<span class="font-bold">
								{data.slack.workspace ? 'Reconectar workspace' : 'Conectar con Slack'}
							</span>
						</a>
					{:else}
						<div class="flex items-center gap-4">
							<img src={slackLogo} alt="Slack" class="h-8 w-8 opacity-40" />
							<div>
								<p class="text-sm font-bold text-white">OAuth no configurado</p>
								<p class="mt-1 text-xs text-[var(--text-muted-relaxed)]">
									Agrega <code class="text-[var(--neon-green)]">SLACK_CLIENT_ID</code> y
									<code class="text-[var(--neon-green)]">SLACK_CLIENT_SECRET</code> para habilitar la
									conexión.
								</p>
							</div>
						</div>
					{/if}

					{#if data.slack.workspace}
						<div class="mt-5 grid gap-3 sm:grid-cols-2">
							<div class="data-cell">
								<p class="text-xs tracking-widest text-[var(--text-dim)] uppercase">Sync n8n</p>
								<p class="mt-2 text-sm text-white">{data.slack.workspace.n8nSyncStatus}</p>
							</div>
							<div class="data-cell">
								<p class="text-xs tracking-widest text-[var(--text-dim)] uppercase">Bot user</p>
								<p class="mt-2 text-sm text-white">
									{data.slack.workspace.botUserId ?? 'Pendiente'}
								</p>
							</div>
						</div>

						{#if data.slack.workspace.n8nSyncError}
							<div class="alert-box alert-box--red mt-4">
								{data.slack.workspace.n8nSyncError}
							</div>
						{/if}

						<div
							class="mt-5 rounded-lg border border-[rgba(255,51,102,0.18)] bg-[rgba(255,51,102,0.05)] p-4"
						>
							<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p class="text-sm font-bold text-white">Desconectar workspace</p>
									<p class="mt-1 text-xs text-[var(--text-muted-relaxed)]">
										Borra el workspace guardado y limpia los defaults y overrides de Slack en la
										base de datos. Si luego necesitas otro workspace, vuelves a conectarlo desde
										cero.
									</p>
								</div>

								<form
									method="POST"
									action="?/disconnectWorkspace"
									class="sm:min-w-[14rem]"
									onsubmit={(event) => {
										if (
											!confirm(
												'Esto eliminará el workspace de Slack y limpiará la configuración guardada en la base de datos. ¿Continuar?'
											)
										) {
											event.preventDefault();
										}
									}}
								>
									<button type="submit" class="slack-disconnect-button w-full">
										Desconectar workspace
									</button>
								</form>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Preferences form -->
		<form method="POST" action="?/savePreferences" class="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
			<section class="terminal-window">
				<div class="terminal-bar">
					<div class="terminal-dots">
						<span class="terminal-dot terminal-dot--red"></span>
						<span class="terminal-dot terminal-dot--yellow"></span>
						<span class="terminal-dot terminal-dot--green"></span>
					</div>
					<span class="terminal-title">$ config --defaults</span>
				</div>

				<div class="terminal-body">
					<div>
						<p class="section-label">Defaults</p>
						<h2 class="mt-3 text-xl font-bold text-white">Nuevos análisis</h2>
					</div>

					<div class="settings-mode-card mt-6">
						<div class="min-w-0">
							<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
								Estado por defecto
							</p>
							<div class="mt-3 flex flex-wrap items-center gap-3">
								<p class="text-base font-bold text-white">
									{enabled ? 'Envío automático activo' : 'Envío automático en pausa'}
								</p>
								<span
									class={enabled ? 'neon-badge neon-badge--green' : 'neon-badge neon-badge--muted'}
								>
									{enabled ? 'activo' : 'en pausa'}
								</span>
							</div>
							<p class="mt-2 text-sm leading-7 text-[var(--text-muted-relaxed)]">
								{enabled
									? 'Los nuevos análisis intentarán publicar en Slack con estas reglas, salvo override por proyecto.'
									: 'El envío queda pausado por defecto. Puedes dejar canal y contenido preparados y reactivarlos luego sin perder esta configuración.'}
							</p>
						</div>

						<label class:slack-state-toggle--enabled={enabled} class="slack-state-toggle">
							<input name="enabled" type="checkbox" bind:checked={enabled} class="sr-only" />
							<span class="slack-state-toggle__track" aria-hidden="true">
								<span class="slack-state-toggle__thumb"></span>
							</span>
							<span class="slack-state-toggle__label">{enabled ? 'Activo' : 'En pausa'}</span>
						</label>
					</div>

					<div class="mt-6 grid gap-5">
						<label class="block">
							<span class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
								Canal de destino
							</span>
							<select name="channelId" class="mt-2 w-full" disabled={!data.slack.channels.length}>
								<option value="">Selecciona un canal</option>
								{#each data.slack.channels as channel}
									<option
										value={channel.id}
										selected={data.slack.defaults.channelId === channel.id}
									>
										{channel.isPrivate ? '[privado] ' : '#'}{channel.name}
									</option>
								{/each}
							</select>
						</label>

						<div>
							<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
								Cuándo enviar
							</p>
							<div class="mt-2 grid gap-2 sm:grid-cols-2">
								<label class="slack-toggle-chip">
									<input
										name="notifyOnSuccess"
										type="checkbox"
										checked={data.slack.defaults.notifyOnSuccess}
										class="m-0 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
									/>
									Al completar
								</label>
								<label class="slack-toggle-chip">
									<input
										name="notifyOnFailure"
										type="checkbox"
										checked={data.slack.defaults.notifyOnFailure}
										class="m-0 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
									/>
									Al fallar
								</label>
							</div>
						</div>

						<div>
							<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
								Contenido
							</p>
							<div class="mt-2 grid gap-2 sm:grid-cols-2">
								<label class="slack-toggle-chip">
									<input
										name="includeExecutiveBrief"
										type="checkbox"
										checked={data.slack.defaults.includeExecutiveBrief}
										class="m-0 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
									/>
									Incluir brief
								</label>
								<label class="slack-toggle-chip">
									<input
										name="includeTopPackages"
										type="checkbox"
										bind:checked={includeTopPackages}
										class="m-0 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
									/>
									Incluir highlights
								</label>
							</div>
						</div>

						<SlackHighlightsLimitField
							name="topPackagesLimit"
							value={data.slack.defaults.topPackagesLimit}
							disabled={!includeTopPackages}
							description={includeTopPackages
								? 'Cuántos paquetes destacados se incluyen en el mensaje.'
								: 'Activa highlights para definir este máximo.'}
						/>
					</div>

					<button type="submit" class="neon-button mt-6 w-full">
						{enabled ? '[ GUARDAR DEFAULTS ]' : '[ GUARDAR EN PAUSA ]'}
					</button>
				</div>
			</section>

			<section class="terminal-window h-fit">
				<div class="terminal-bar">
					<div class="terminal-dots">
						<span class="terminal-dot terminal-dot--red"></span>
						<span class="terminal-dot terminal-dot--yellow"></span>
						<span class="terminal-dot terminal-dot--green"></span>
					</div>
					<span class="terminal-title">$ info</span>
				</div>

				<div class="terminal-body">
					<p class="section-label">Notas</p>
					<div class="mt-4 grid gap-3">
						<div class="data-cell">
							<p class="text-sm font-bold text-white">Un workspace por despliegue</p>
							<p class="mt-1 text-xs text-[var(--text-muted-relaxed)]">
								n8n publica con su nodo oficial de Slack.
							</p>
						</div>
						<div class="data-cell">
							<p class="text-sm font-bold text-white">Canales privados</p>
							<p class="mt-1 text-xs text-[var(--text-muted-relaxed)]">
								Invita al bot primero para que aparezcan en el selector.
							</p>
						</div>
						<div class="data-cell">
							<p class="text-sm font-bold text-white">Override por proyecto</p>
							<p class="mt-1 text-xs text-[var(--text-muted-relaxed)]">
								Cada análisis puede sobrescribir estos defaults desde su propia vista.
							</p>
						</div>
					</div>
				</div>
			</section>
		</form>
	</div>
</div>

<style>
	.slack-connection-state {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.125rem;
		border-radius: 14px;
		border: 1px solid rgba(15, 255, 106, 0.22);
		background: linear-gradient(135deg, rgba(15, 255, 106, 0.08), rgba(0, 229, 255, 0.04));
	}

	.slack-install-button {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 14px 28px;
		border-radius: 12px;
		border: 1px solid rgba(15, 255, 106, 0.35);
		background: linear-gradient(135deg, rgba(15, 255, 106, 0.08), rgba(0, 229, 255, 0.06));
		color: white;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
		transition: all 0.25s;
		width: 100%;
		justify-content: center;
	}

	.slack-install-button:hover {
		border-color: rgba(15, 255, 106, 0.6);
		background: linear-gradient(135deg, rgba(15, 255, 106, 0.14), rgba(0, 229, 255, 0.1));
		box-shadow:
			0 0 24px rgba(15, 255, 106, 0.15),
			0 0 60px rgba(15, 255, 106, 0.05);
		transform: translateY(-2px);
	}

	.slack-install-button:active {
		transform: scale(0.98);
	}

	.slack-inline-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 1rem;
		border-radius: 999px;
		border: 1px solid rgba(15, 255, 106, 0.24);
		background: rgba(10, 10, 15, 0.52);
		color: #d7ffea;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		transition:
			border-color 0.2s,
			color 0.2s,
			transform 0.2s,
			background 0.2s;
	}

	.slack-inline-link:hover {
		transform: translateY(-1px);
		border-color: rgba(15, 255, 106, 0.48);
		color: white;
		background: rgba(15, 255, 106, 0.08);
	}

	.settings-mode-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.125rem;
		border-radius: 14px;
		border: 1px solid rgba(15, 255, 106, 0.18);
		background: rgba(10, 10, 15, 0.48);
	}

	.slack-state-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.55rem 0.85rem;
		border-radius: 999px;
		border: 1px solid rgba(15, 255, 106, 0.18);
		background: rgba(10, 10, 15, 0.72);
		cursor: pointer;
		user-select: none;
		transition:
			border-color 0.2s,
			background 0.2s,
			box-shadow 0.2s;
	}

	.slack-state-toggle--enabled {
		border-color: rgba(15, 255, 106, 0.38);
		background: rgba(15, 255, 106, 0.08);
		box-shadow: 0 0 24px rgba(15, 255, 106, 0.08);
	}

	.slack-state-toggle__track {
		position: relative;
		display: inline-flex;
		height: 24px;
		width: 44px;
		align-items: center;
		border-radius: 999px;
		border: 1px solid rgba(15, 255, 106, 0.2);
		background: rgba(255, 255, 255, 0.08);
	}

	.slack-state-toggle__thumb {
		position: absolute;
		left: 2px;
		height: 18px;
		width: 18px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.88);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		transition:
			transform 0.2s ease,
			background 0.2s ease,
			box-shadow 0.2s ease;
	}

	.slack-state-toggle--enabled .slack-state-toggle__thumb {
		transform: translateX(19px);
		background: var(--neon-green);
		box-shadow: 0 0 14px rgba(15, 255, 106, 0.34);
	}

	.slack-state-toggle__label {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #d7ffea;
	}

	.slack-disconnect-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 12px 18px;
		border-radius: 12px;
		border: 1px solid rgba(255, 51, 102, 0.45);
		background: linear-gradient(135deg, rgba(255, 51, 102, 0.14), rgba(255, 82, 82, 0.08));
		color: #ffd9e2;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			transform 0.2s,
			border-color 0.2s,
			box-shadow 0.2s,
			background 0.2s;
	}

	.slack-disconnect-button:hover {
		transform: translateY(-1px);
		border-color: rgba(255, 51, 102, 0.7);
		background: linear-gradient(135deg, rgba(255, 51, 102, 0.2), rgba(255, 82, 82, 0.12));
		box-shadow:
			0 0 24px rgba(255, 51, 102, 0.18),
			0 0 56px rgba(255, 51, 102, 0.08);
	}

	.slack-disconnect-button:active {
		transform: scale(0.98);
	}

	@media (max-width: 640px) {
		.slack-connection-state,
		.settings-mode-card {
			flex-direction: column;
			align-items: stretch;
		}

		.slack-inline-link,
		.slack-state-toggle {
			justify-content: center;
		}
	}
</style>
