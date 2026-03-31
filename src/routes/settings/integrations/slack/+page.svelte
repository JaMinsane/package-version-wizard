<script lang="ts">
	import { page } from '$app/stores';
	import slackLogo from '$lib/assets/slack-logo.svg';

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
	<meta
		name="description"
		content="Conecta Slack y configura las notificaciones de análisis."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">

		<!-- Status alerts -->
		{#if $page.url.searchParams.get('slack') === 'connected'}
			<div class="alert-box alert-box--green">
				Slack conectado. Credencial sincronizada con n8n.
			</div>
		{:else if $page.url.searchParams.get('slack') === 'connect-error'}
			<div class="alert-box alert-box--red">
				La instalación o sincronización con n8n falló.
			</div>
		{:else if $page.url.searchParams.get('slack') === 'denied'}
			<div class="alert-box alert-box--amber">
				La instalación fue cancelada desde Slack.
			</div>
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
						<h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
							Slack
						</h1>
					</div>

					<div class="flex items-center gap-3">
						{#if data.slack.workspace}
							<span class="neon-badge neon-badge--green">
								<span class="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"></span>
								{data.slack.workspace.teamName}
							</span>
						{:else}
							<span class="neon-badge neon-badge--amber">Sin workspace</span>
						{/if}
					</div>
				</div>

				<!-- Prominent install/reconnect button -->
				<div class="mt-6 rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.45)] p-6">
					{#if data.slack.installReady}
						<a
							href="/settings/integrations/slack/connect"
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
									<code class="text-[var(--neon-green)]">SLACK_CLIENT_SECRET</code> para habilitar la conexión.
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
					{/if}
				</div>
			</div>
		</section>

		<!-- Preferences form -->
		<form
			method="POST"
			action="?/savePreferences"
			class="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]"
		>
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
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="section-label">Defaults</p>
							<h2 class="mt-3 text-xl font-bold text-white">Configuración por defecto</h2>
							<p class="mt-2 text-sm text-[var(--text-muted-relaxed)]">
								Se aplica a nuevos proyectos a menos que los sobrescribas.
							</p>
						</div>

						<label class="neon-badge neon-badge--green cursor-pointer">
							<input
								name="enabled"
								type="checkbox"
								bind:checked={enabled}
								class="rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
							/>
							Activar
						</label>
					</div>

					<div class="mt-6 grid gap-4">
						<label class="block">
							<span class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
								Canal por defecto
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

						<div class="grid gap-3 sm:grid-cols-2">
							<label class="data-cell cursor-pointer">
								<input
									name="notifyOnSuccess"
									type="checkbox"
									checked={data.slack.defaults.notifyOnSuccess}
									class="mr-3 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
								/>
								Al completar
							</label>
							<label class="data-cell cursor-pointer">
								<input
									name="notifyOnFailure"
									type="checkbox"
									checked={data.slack.defaults.notifyOnFailure}
									class="mr-3 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
								/>
								Al fallar
							</label>
							<label class="data-cell cursor-pointer">
								<input
									name="includeExecutiveBrief"
									type="checkbox"
									checked={data.slack.defaults.includeExecutiveBrief}
									class="mr-3 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
								/>
								Incluir brief
							</label>
							<label class="data-cell cursor-pointer">
								<input
									name="includeTopPackages"
									type="checkbox"
									bind:checked={includeTopPackages}
									class="mr-3 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
								/>
								Incluir highlights
							</label>
						</div>

						<label class="block">
							<span class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
								Límite de highlights
							</span>
							<input
								name="topPackagesLimit"
								type="number"
								min="1"
								max="10"
								value={data.slack.defaults.topPackagesLimit}
								disabled={!includeTopPackages}
								class="mt-2 w-full"
							/>
						</label>
					</div>

					<button type="submit" class="neon-button mt-6 w-full"> [ GUARDAR ] </button>
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
</style>
