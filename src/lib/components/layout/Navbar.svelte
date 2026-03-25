<script lang="ts">
	import { page } from '$app/stores';

	const navLinks = [
		{ href: '/', label: 'home', command: '$ cd' },
		{ href: '/#signals', label: '--signals', command: '$ watch' },
		{ href: '/#workflow', label: '--flow', command: '$ man' }
	];
</script>

<header class="fixed top-0 left-0 right-0 z-50">
	<nav class="flex items-center justify-between gap-4 border-b border-[var(--border-green)] bg-[rgba(10,10,15,0.85)] px-4 py-2.5 backdrop-blur-xl sm:px-6">
		<!-- Left: Logo / status -->
		<a href="/" class="flex items-center gap-2.5 shrink-0">
			<span class="neon-badge neon-badge--green flex items-center gap-1.5">
				<span class="inline-block h-2 w-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_6px_var(--neon-green)]"></span>
				ready
			</span>
			<span class="text-xs font-medium text-[var(--text-primary)]">
				~/pvw<span class="cursor-blink"></span>
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
					<span class="text-[var(--text-muted)]">{link.label}</span>
				</a>
			{/each}
		</div>

		<!-- Right: CTA -->
		<div class="flex items-center gap-2.5">
			<a
				href="/upload"
				class="nav-cta"
			>
				<span class="text-[var(--neon-green)]">$</span>
				Iniciar sesión
				<span class="text-[var(--neon-green)]">→</span>
			</a>
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
</style>
