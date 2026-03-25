<script lang="ts">
	import { enhance } from '$app/forms';

	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let mode: 'login' | 'register' = $state(form?.action === 'register' ? 'register' : 'login');
	let showPassword = $state(false);
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} | Package Version Wizard</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-10">
	<div class="w-full max-w-md">
		<!-- Terminal window -->
		<div class="terminal-window">
			<div class="terminal-bar">
				<div class="terminal-dots">
					<span class="terminal-dot terminal-dot--red"></span>
					<span class="terminal-dot terminal-dot--yellow"></span>
					<span class="terminal-dot terminal-dot--green"></span>
				</div>
				<span class="terminal-title">$ auth --{mode === 'login' ? 'login' : 'register'}</span>
			</div>

			<div class="terminal-body">
				<!-- Tab switcher -->
				<div class="mb-6 flex gap-1 rounded-lg border border-[var(--border-green)] bg-[rgba(15,255,106,0.02)] p-1">
					<button
						type="button"
						class="auth-tab"
						class:auth-tab--active={mode === 'login'}
						onclick={() => (mode = 'login')}
					>
						<span class="text-[var(--neon-green)]">$</span> login
					</button>
					<button
						type="button"
						class="auth-tab"
						class:auth-tab--active={mode === 'register'}
						onclick={() => (mode = 'register')}
					>
						<span class="text-[var(--neon-green)]">$</span> register --new
					</button>
				</div>

				<!-- Error message -->
				{#if form?.message && form.action === mode}
					<div class="alert-box alert-box--red mb-5">
						<span class="text-xs font-bold uppercase tracking-widest">ERROR</span>
						<p class="mt-1 text-sm">{form.message}</p>
					</div>
				{/if}

				<!-- Login form -->
				{#if mode === 'login'}
					<form method="POST" action="?/login" use:enhance class="flex flex-col gap-4">
						<div class="form-field">
							<label for="login-email" class="form-label">
								<span class="text-[var(--neon-green)]">></span> correo
							</label>
							<input
								id="login-email"
								type="email"
								name="email"
								required
								autocomplete="email"
								placeholder="usuario@ejemplo.com"
								value={form?.action === 'login' ? form.values?.email ?? '' : ''}
								class="form-input"
							/>
						</div>

						<div class="form-field">
							<label for="login-password" class="form-label">
								<span class="text-[var(--neon-green)]">></span> contraseña
							</label>
							<div class="relative">
								<input
									id="login-password"
									type={showPassword ? 'text' : 'password'}
									name="password"
									required
									autocomplete="current-password"
									placeholder="••••••"
									class="form-input pr-16"
								/>
								<button
									type="button"
									class="absolute right-2 top-1/2 -translate-y-1/2 text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:text-[var(--neon-green)]"
									onclick={() => (showPassword = !showPassword)}
								>
									{showPassword ? 'ocultar' : 'mostrar'}
								</button>
							</div>
						</div>

						<button type="submit" class="neon-button mt-2">
							● [ INICIAR SESIÓN ]
						</button>
					</form>
				{/if}

				<!-- Register form -->
				{#if mode === 'register'}
					<form method="POST" action="?/register" use:enhance class="flex flex-col gap-4">
						<div class="form-field">
							<label for="register-name" class="form-label">
								<span class="text-[var(--neon-green)]">></span> nombre
							</label>
							<input
								id="register-name"
								type="text"
								name="name"
								required
								autocomplete="name"
								placeholder="Tu nombre completo"
								value={form?.action === 'register' ? form.values?.name ?? '' : ''}
								class="form-input"
							/>
						</div>

						<div class="form-field">
							<label for="register-email" class="form-label">
								<span class="text-[var(--neon-green)]">></span> correo
							</label>
							<input
								id="register-email"
								type="email"
								name="email"
								required
								autocomplete="email"
								placeholder="usuario@ejemplo.com"
								value={form?.action === 'register' ? form.values?.email ?? '' : ''}
								class="form-input"
							/>
						</div>

						<div class="form-field">
							<label for="register-password" class="form-label">
								<span class="text-[var(--neon-green)]">></span> contraseña
								<span class="text-[var(--text-dim)] text-[0.6rem]">(mín. 6 caracteres)</span>
							</label>
							<div class="relative">
								<input
									id="register-password"
									type={showPassword ? 'text' : 'password'}
									name="password"
									required
									minlength="6"
									autocomplete="new-password"
									placeholder="••••••"
									class="form-input pr-16"
								/>
								<button
									type="button"
									class="absolute right-2 top-1/2 -translate-y-1/2 text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:text-[var(--neon-green)]"
									onclick={() => (showPassword = !showPassword)}
								>
									{showPassword ? 'ocultar' : 'mostrar'}
								</button>
							</div>
						</div>

						<button type="submit" class="neon-button mt-2">
							● [ CREAR CUENTA ]
						</button>
					</form>
				{/if}

				<!-- Footer hint -->
				<p class="mt-6 text-center text-xs text-[var(--text-dim)]">
					{#if mode === 'login'}
						¿No tienes cuenta?
						<button
							type="button"
							class="text-[var(--neon-green)] underline-offset-2 hover:underline"
							onclick={() => (mode = 'register')}
						>
							Crea una aquí
						</button>
					{:else}
						¿Ya tienes cuenta?
						<button
							type="button"
							class="text-[var(--neon-green)] underline-offset-2 hover:underline"
							onclick={() => (mode = 'login')}
						>
							Inicia sesión
						</button>
					{/if}
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	.auth-tab {
		flex: 1;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		background: transparent;
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
	}

	.auth-tab:hover {
		color: var(--text-primary);
	}

	.auth-tab--active {
		color: var(--neon-green);
		background: rgba(15, 255, 106, 0.08);
		border-color: var(--border-green);
		text-shadow: 0 0 8px rgba(15, 255, 106, 0.4);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
	}

	.form-input {
		width: 100%;
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid var(--border-green);
		background: rgba(15, 255, 106, 0.03);
		color: var(--text-primary);
		font-size: 0.85rem;
		font-family: 'JetBrains Mono', monospace;
		transition: all 0.15s;
	}

	.form-input::placeholder {
		color: var(--text-dim);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--neon-green);
		box-shadow: 0 0 12px rgba(15, 255, 106, 0.15);
	}
</style>
