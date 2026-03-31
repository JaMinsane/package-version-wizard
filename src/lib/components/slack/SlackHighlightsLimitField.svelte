<script lang="ts">
	interface Props {
		name: string;
		value?: number;
		min?: number;
		max?: number;
		disabled?: boolean;
		label?: string;
		description?: string;
	}

	let {
		name,
		value = $bindable(3),
		min = 1,
		max = 10,
		disabled = false,
		label = 'Máximo de highlights',
		description = 'Controla cuántos paquetes clave aparecen en el digest de Slack.'
	}: Props = $props();

	function clamp(candidate: number) {
		if (!Number.isFinite(candidate)) {
			return min;
		}

		return Math.min(max, Math.max(min, Math.round(candidate)));
	}

	function setValue(candidate: number) {
		value = clamp(candidate);
	}

	function getQuickPicks() {
		return [...new Set([min, 3, 5, max, value])]
			.filter((candidate) => candidate >= min && candidate <= max)
			.sort((left, right) => left - right);
	}

	function getQuickPickClass(option: number) {
		const baseClass =
			'rounded-lg border px-3 py-2 text-xs font-bold tracking-[0.24em] uppercase transition hover:border-[rgba(15,255,106,0.4)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

		if (clamp(value) === option) {
			return `${baseClass} border-[rgba(15,255,106,0.5)] bg-[rgba(15,255,106,0.14)] text-[var(--neon-green)] shadow-[0_0_18px_rgba(15,255,106,0.12)]`;
		}

		return `${baseClass} border-[var(--border-green)] bg-[rgba(10,10,15,0.68)] text-[var(--text-muted-relaxed)]`;
	}
</script>

<label class="block">
	<span class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
		{label}
	</span>

	<input type="hidden" name={name} value={clamp(value)} />

	<div
		class:opacity-60={disabled}
		class="mt-2 rounded-xl border border-[var(--border-green)] bg-[rgba(10,10,15,0.72)] p-4 transition-opacity"
	>
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="max-w-xl">
				<p class="text-sm leading-6 text-[var(--text-muted-relaxed)]">
					{description}
				</p>
				<p class="mt-2 text-xs tracking-[0.24em] text-[var(--text-dim)] uppercase">
					Default operativo: 3
				</p>
			</div>

			<div class="rounded-lg border border-[rgba(15,255,106,0.2)] bg-[rgba(15,255,106,0.05)] px-4 py-3">
				<p class="text-[0.65rem] font-bold tracking-[0.28em] text-[var(--text-dim)] uppercase">
					Actual
				</p>
				<p class="mt-1 text-right text-2xl font-bold text-white">{clamp(value)}</p>
			</div>
		</div>

		<div class="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
			<button
				type="button"
				class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.78)] px-4 py-3 text-lg font-bold text-white transition hover:border-[rgba(15,255,106,0.4)] hover:text-[var(--neon-green)] disabled:cursor-not-allowed disabled:opacity-40"
				disabled={disabled || clamp(value) <= min}
				onclick={() => setValue(clamp(value) - 1)}
				aria-label="Reducir límite de highlights"
			>
				-
			</button>

			<div class="rounded-lg border border-[rgba(15,255,106,0.12)] bg-[rgba(15,255,106,0.04)] px-4 py-3 text-center text-sm leading-6 text-[var(--text-muted-relaxed)]">
				{#if disabled}
					Activa highlights para ajustar este máximo.
				{:else}
					El mensaje incluirá hasta <span class="font-bold text-white">{clamp(value)}</span>
					paquetes clave.
				{/if}
			</div>

			<button
				type="button"
				class="rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.78)] px-4 py-3 text-lg font-bold text-white transition hover:border-[rgba(15,255,106,0.4)] hover:text-[var(--neon-green)] disabled:cursor-not-allowed disabled:opacity-40"
				disabled={disabled || clamp(value) >= max}
				onclick={() => setValue(clamp(value) + 1)}
				aria-label="Incrementar límite de highlights"
			>
				+
			</button>
		</div>

		<div class="mt-4 flex flex-wrap gap-2">
			{#each getQuickPicks() as option}
				<button
					type="button"
					class={getQuickPickClass(option)}
					disabled={disabled}
					onclick={() => setValue(option)}
					aria-pressed={clamp(value) === option}
				>
					{option}
				</button>
			{/each}
		</div>
	</div>
</label>
