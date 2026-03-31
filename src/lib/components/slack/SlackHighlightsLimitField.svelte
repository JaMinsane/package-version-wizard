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
		description = ''
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

</script>

<label class="block">
	<input type="hidden" name={name} value={clamp(value)} />

	<div
		class:opacity-60={disabled}
		class="mt-1 flex items-center justify-between gap-3 rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.45)] px-4 py-3 transition-opacity"
	>
		<div class="min-w-0">
			<p class="text-xs font-bold tracking-widest text-[var(--text-dim)] uppercase">
				{label}
			</p>
			{#if description}
				<p class="mt-1 text-xs text-[var(--text-muted-relaxed)]">{description}</p>
			{/if}
		</div>

		<div class="inline-flex shrink-0 items-center rounded-lg border border-[var(--border-green)] bg-[rgba(10,10,15,0.72)]">
			<button
				type="button"
				class="px-3 py-2 text-sm font-bold text-white transition hover:text-[var(--neon-green)] disabled:cursor-not-allowed disabled:opacity-40"
				disabled={disabled || clamp(value) <= min}
				onclick={() => setValue(clamp(value) - 1)}
				aria-label="Reducir límite de highlights"
			>
				-
			</button>

			<span
				class="min-w-11 border-x border-[var(--border-green)] px-4 py-2 text-center text-sm font-bold text-white"
			>
				{clamp(value)}
			</span>

			<button
				type="button"
				class="px-3 py-2 text-sm font-bold text-white transition hover:text-[var(--neon-green)] disabled:cursor-not-allowed disabled:opacity-40"
				disabled={disabled || clamp(value) >= max}
				onclick={() => setValue(clamp(value) + 1)}
				aria-label="Incrementar límite de highlights"
			>
				+
			</button>
		</div>
	</div>
</label>
