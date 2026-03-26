<script lang="ts">
	import { page } from '$app/stores';

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
	<title>Integración Slack | Package Version Wizard</title>
	<meta
		name="description"
		content="Conecta Slack y define las notificaciones por defecto para los análisis de dependencias."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
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
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div class="max-w-2xl">
						<p class="section-label">Integración</p>
						<h1 class="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
							Slack como salida del brief final
						</h1>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
							Conecta un único workspace para este despliegue, define el canal por defecto y deja
							las notificaciones listas para cuando termine cada análisis.
						</p>
					</div>

					{#if data.slack.installReady}
						<a href="/settings/integrations/slack/connect" class="nav-cta">
							<span class="text-[var(--neon-green)]">$</span>
							{data.slack.workspace ? 'Reconectar Slack' : 'Instalar bot en Slack'}
						</a>
					{:else}
						<span class="neon-badge neon-badge--amber">Falta configurar OAuth</span>
					{/if}
				</div>

				<div class="mt-6 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
					<div class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.45)] p-5">
						<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
							Workspace activo
						</p>
						{#if data.slack.workspace}
							<h2 class="mt-3 text-xl font-bold text-white">{data.slack.workspace.teamName}</h2>
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
						{:else}
							<div class="alert-box alert-box--amber mt-4">
								Todavía no hay un workspace conectado. Instala el bot para habilitar el selector de
								canales y las notificaciones automáticas.
							</div>
						{/if}
					</div>

					<div
						class="rounded-lg border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.04)] p-5"
					>
						<span class="neon-badge neon-badge--cyan">Modo v1</span>
						<h2 class="mt-3 text-lg font-bold text-white">Qué se enviará a Slack</h2>
						<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
							El canal recibe el brief ejecutivo corto, highlights de paquetes y el link directo al
							análisis completo. Si el flujo falla, también se publica un resumen operativo del
							error.
						</p>
						<p class="mt-4 text-sm leading-7 text-[var(--text-muted-relaxed)]">
							Los canales privados solo aparecen si el bot ya fue invitado.
						</p>
					</div>
				</div>

				{#if $page.url.searchParams.get('slack') === 'connected'}
					<div class="alert-box alert-box--green mt-6">
						Slack quedó conectado y la credencial administrada se intentó sincronizar con n8n.
					</div>
				{:else if $page.url.searchParams.get('slack') === 'connect-error'}
					<div class="alert-box alert-box--red mt-6">
						Slack respondió, pero la instalación o la sincronización con n8n falló.
					</div>
				{:else if $page.url.searchParams.get('slack') === 'denied'}
					<div class="alert-box alert-box--amber mt-6">
						La instalación de Slack fue cancelada desde la pantalla de autorización.
					</div>
				{:else if $page.url.searchParams.get('slack') === 'invalid-state'}
					<div class="alert-box alert-box--red mt-6">
						No se pudo validar el retorno de Slack. Intenta iniciar la instalación otra vez.
					</div>
				{/if}

				{#if form?.successMessage}
					<div class="alert-box alert-box--green mt-6">{form.successMessage}</div>
				{:else if form?.errorMessage}
					<div class="alert-box alert-box--red mt-6">{form.errorMessage}</div>
				{/if}

				<form
					method="POST"
					action="?/savePreferences"
					class="mt-6 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]"
				>
					<div
						class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5 sm:p-6"
					>
						<div class="flex items-start justify-between gap-4">
							<div>
								<p
									class="text-xs font-bold tracking-widest text-[var(--text-muted-relaxed)] uppercase"
								>
									Defaults
								</p>
								<h2 class="mt-3 text-xl font-bold text-white">Configuración por usuario</h2>
								<p class="mt-3 text-sm leading-7 text-[var(--text-muted-relaxed)]">
									Estos valores se aplican a nuevos proyectos y análisis del usuario salvo que un
									proyecto sobrescriba la configuración.
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
									Notificar éxito
								</label>
								<label class="data-cell cursor-pointer">
									<input
										name="notifyOnFailure"
										type="checkbox"
										checked={data.slack.defaults.notifyOnFailure}
										class="mr-3 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
									/>
									Notificar fallo
								</label>
								<label class="data-cell cursor-pointer">
									<input
										name="includeExecutiveBrief"
										type="checkbox"
										checked={data.slack.defaults.includeExecutiveBrief}
										class="mr-3 rounded border-[var(--border-green)] bg-transparent text-[var(--neon-green)] focus:ring-[var(--neon-green)]"
									/>
									Incluir brief ejecutivo
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
					</div>

					<div
						class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.5)] p-5 sm:p-6"
					>
						<p class="text-xs font-bold tracking-widest text-[var(--text-muted-relaxed)] uppercase">
							Notas operativas
						</p>
						<div class="mt-5 grid gap-3">
							<div class="data-cell">
								<p class="text-sm font-bold text-white">Workspace único</p>
								<p class="mt-2 text-sm leading-7 text-[var(--text-muted-relaxed)]">
									La app usa un solo workspace por despliegue y n8n publica con su nodo oficial de
									Slack.
								</p>
							</div>
							<div class="data-cell">
								<p class="text-sm font-bold text-white">Canales privados</p>
								<p class="mt-2 text-sm leading-7 text-[var(--text-muted-relaxed)]">
									Si quieres usar uno, invita primero al bot para que aparezca en el selector.
								</p>
							</div>
							<div class="data-cell">
								<p class="text-sm font-bold text-white">Análisis existentes</p>
								<p class="mt-2 text-sm leading-7 text-[var(--text-muted-relaxed)]">
									Los proyectos pueden sobrescribir este default desde su propia vista de análisis.
								</p>
							</div>
						</div>

						<button type="submit" class="neon-button mt-6 w-full"> [ GUARDAR DEFAULTS ] </button>
					</div>
				</form>
			</div>
		</section>
	</div>
</div>
