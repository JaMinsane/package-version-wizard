<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<form method="POST" use:enhance>
	<p class="text-center text-sm text-[var(--text-muted)]">Cerrando sesión...</p>
</form>

<script lang="ts">
	import { onMount } from 'svelte';
	onMount(() => {
		document.querySelector('form')?.requestSubmit();
	});
</script>
