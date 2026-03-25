<script lang="ts">
	interface Props {
		requestJson: string;
		callbackJson: string;
	}

	let { requestJson, callbackJson }: Props = $props();
</script>

<details class="surface-panel group rounded-[2rem] p-6">
	<summary class="flex cursor-pointer list-none items-center justify-between gap-3">
		<div>
			<p class="section-label">Panel técnico</p>
			<h2 class="mt-3 text-2xl font-semibold text-white">Payload y callback crudos</h2>
		</div>
		<span class="text-sm font-medium text-slate-400 transition group-open:rotate-45">+</span>
	</summary>

	<div class="mt-6 grid gap-4 xl:grid-cols-2">
		<div class="rounded-[1.7rem] border border-white/10 bg-slate-950/55 p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payload enviado</p>
			<pre class="mt-3 overflow-x-auto font-mono text-xs leading-6 text-slate-200">{requestJson}</pre>
		</div>

		<div class="rounded-[1.7rem] border border-white/10 bg-slate-950/55 p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Callback recibido</p>
			<pre class="mt-3 overflow-x-auto font-mono text-xs leading-6 text-slate-200">{callbackJson || 'Pendiente'}</pre>
		</div>
	</div>
</details>
