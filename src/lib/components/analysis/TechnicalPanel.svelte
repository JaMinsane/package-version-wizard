<script lang="ts">
	interface Props {
		requestJson: string;
		callbackJson: string;
	}

	let { requestJson, callbackJson }: Props = $props();
</script>

<details class="terminal-window group">
	<summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-6">
		<div>
			<p class="section-label">Panel técnico</p>
			<h2 class="mt-2 text-xl font-bold text-white">Payload y callback crudos</h2>
		</div>
		<span class="text-sm font-bold text-[var(--neon-green)] transition group-open:rotate-45">+</span>
	</summary>

	<div class="border-t border-[var(--border-green)] p-6">
		<div class="grid gap-4 xl:grid-cols-2">
			<div class="rounded-lg border border-[var(--border-green)] bg-[rgba(5,5,8,0.8)] p-4">
				<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Payload enviado</p>
				<pre class="mt-3 overflow-x-auto text-xs leading-6 text-[var(--neon-green)]">{requestJson}</pre>
			</div>

			<div class="rounded-lg border border-[var(--border-green)] bg-[rgba(5,5,8,0.8)] p-4">
				<p class="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">Callback recibido</p>
				<pre class="mt-3 overflow-x-auto text-xs leading-6 text-[var(--neon-green)]">{callbackJson || 'Pendiente'}</pre>
			</div>
		</div>
	</div>
</details>
