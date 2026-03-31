<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	interface Props {
		user?: { id: string; name: string; email: string } | null;
	}

	let { user = null }: Props = $props();
	let isUserMenuOpen = $state(false);
	let userMenuElement = $state<HTMLDivElement | null>(null);

	const navLinks = [
		{ href: '/', label: 'home', command: '$ cd' },
		{ href: '/#signals', label: '--signals', command: '$ watch' },
		{ href: '/#workflow', label: '--flow', command: '$ man' }
	];

	function toggleUserMenu() {
		isUserMenuOpen = !isUserMenuOpen;
	}

	function closeUserMenu() {
		isUserMenuOpen = false;
	}

	function handleWindowPointerDown(event: PointerEvent) {
		if (!isUserMenuOpen || !userMenuElement) {
			return;
		}

		if (event.target instanceof Node && userMenuElement.contains(event.target)) {
			return;
		}

		closeUserMenu();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeUserMenu();
		}
	}
</script>

<svelte:window onpointerdown={handleWindowPointerDown} onkeydown={handleWindowKeydown} />

<header
	class="fixed top-0 right-0 left-0 z-50 border-b border-[var(--border-green)] bg-[rgba(10,10,15,0.85)] backdrop-blur-xl"
>
	<nav class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
		<!-- Left: Logo / status -->
		<a href="/" class="flex shrink-0 items-center gap-2.5">
			<span class="neon-badge neon-badge--green flex items-center gap-1.5">
				<span
					class="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"
				></span>
				ready
			</span>
			<span class="text-xs font-medium text-[var(--text-foreground)]">
				~/pvw --hackathon midudev-cubepath-2026<span class="cursor-blink"></span>
			</span>
		</a>

		<!-- Center: Nav links (hidden on mobile) -->
		<div class="hidden items-center gap-2 md:flex">
			{#each navLinks as link}
				<a
					href={link.href}
					class="nav-link"
					class:nav-link--active={$page.url.pathname === link.href}
				>
					<span class="text-[var(--neon-green)]">{link.command}</span>
					<span class="text-[var(--text-muted-relaxed)]">{link.label}</span>
				</a>
			{/each}

			{#if user}
				<a
					href="/upload"
					class="nav-link"
					class:nav-link--active={$page.url.pathname === '/upload'}
				>
					<span class="text-[var(--neon-green)]">$ run</span>
					<span class="text-[var(--text-muted-relaxed)]">/analyze</span>
				</a>
			{/if}
		</div>

		<!-- Right: Auth -->
		<div class="flex items-center gap-2.5">
			{#if user}
				<div class="relative" bind:this={userMenuElement}>
					<button
						type="button"
						class="user-menu-trigger"
						class:user-menu-trigger--active={isUserMenuOpen ||
							$page.url.pathname.startsWith('/settings/integrations/slack')}
						aria-haspopup="menu"
						aria-expanded={isUserMenuOpen}
						onclick={toggleUserMenu}
					>
						<span class="text-[var(--neon-green)]">$ whoami</span>
						<span class="max-w-32 truncate text-[var(--text-foreground)]">{user.name}</span>
						<span class:user-menu-caret--open={isUserMenuOpen} class="user-menu-caret">{'>'}</span>
					</button>

					{#if isUserMenuOpen}
						<div class="user-menu-panel" role="menu" aria-label="Menú de usuario">
							<div class="border-b border-[var(--border-green)] px-4 py-3">
								<p class="text-xs font-bold tracking-[0.18em] text-[var(--neon-green)] uppercase">
									Usuario activo
								</p>
								<p class="mt-2 text-sm font-semibold text-white">{user.name}</p>
								<p class="mt-1 text-xs text-[var(--text-muted-relaxed)]">{user.email}</p>
							</div>

							<div class="p-2">
								<a
									href="/upload"
									class="user-menu-link"
									class:user-menu-link--active={$page.url.pathname === '/upload'}
									role="menuitem"
									onclick={closeUserMenu}
								>
									<span class="text-[var(--neon-green)]">$ run</span>
									<span>/analyze</span>
								</a>
								<a
									href="/settings/integrations/slack"
									class="user-menu-link"
									class:user-menu-link--active={$page.url.pathname.startsWith(
										'/settings/integrations/slack'
									)}
									role="menuitem"
									onclick={closeUserMenu}
								>
									<span class="text-[var(--neon-cyan)]">$ open</span>
									<span>/slack settings</span>
								</a>

								<form method="POST" action="/logout" use:enhance>
									<button
										type="submit"
										class="user-menu-link user-menu-link--danger"
										role="menuitem"
									>
										<span class="text-[var(--neon-red)]">$ exit</span>
										<span>logout</span>
									</button>
								</form>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/login" class="nav-cta">
					<span class="text-[var(--neon-green)]">$</span>
					Iniciar sesión
					<span class="text-[var(--neon-green)]">→</span>
				</a>
			{/if}
		</div>
	</nav>
</header>

<!-- Spacer to prevent content from hiding behind fixed header -->
<div class="h-12"></div>

<style>
	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid transparent;
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		background: transparent;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.nav-link:hover {
		border-color: var(--border-green);
		background: rgba(15, 255, 106, 0.04);
	}

	.nav-link--active {
		border-color: var(--border-green);
		background: rgba(15, 255, 106, 0.06);
	}

	.nav-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: 8px;
		border: 1px solid rgba(15, 255, 106, 0.4);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--neon-green);
		background: rgba(15, 255, 106, 0.06);
		transition: all 0.2s;
		white-space: nowrap;
	}

	.nav-cta:hover {
		background: rgba(15, 255, 106, 0.12);
		box-shadow: 0 0 16px rgba(15, 255, 106, 0.2);
		transform: translateY(-1px);
	}

	.nav-cta:active {
		transform: scale(0.95);
	}

	.user-menu-trigger {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid rgba(15, 255, 106, 0.25);
		background: rgba(15, 255, 106, 0.05);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		transition:
			border-color 0.15s,
			background 0.15s,
			box-shadow 0.15s;
	}

	.user-menu-trigger:hover,
	.user-menu-trigger--active {
		border-color: rgba(15, 255, 106, 0.45);
		background: rgba(15, 255, 106, 0.1);
		box-shadow: 0 0 16px rgba(15, 255, 106, 0.14);
	}

	.user-menu-caret {
		color: var(--text-muted-relaxed);
		transition: transform 0.15s ease;
	}

	.user-menu-caret--open {
		transform: rotate(90deg);
	}

	.user-menu-panel {
		position: absolute;
		top: calc(100% + 10px);
		right: 0;
		width: min(18rem, calc(100vw - 2rem));
		border: 1px solid rgba(15, 255, 106, 0.18);
		border-radius: 12px;
		background: rgba(10, 10, 15, 0.96);
		box-shadow:
			0 22px 60px rgba(0, 0, 0, 0.45),
			0 0 30px rgba(15, 255, 106, 0.08);
		backdrop-filter: blur(16px);
		overflow: hidden;
	}

	.user-menu-link {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 11px 12px;
		border-radius: 10px;
		border: 1px solid transparent;
		color: var(--text-foreground);
		background: transparent;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-align: left;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.user-menu-link:hover,
	.user-menu-link--active {
		border-color: var(--border-green);
		background: rgba(15, 255, 106, 0.05);
	}

	.user-menu-link--danger:hover {
		border-color: rgba(255, 85, 85, 0.25);
		background: rgba(255, 85, 85, 0.06);
	}
</style>
