<script lang="ts">
	import { browser } from '$app/environment';

	import type { ActionData, PageData } from './$types';
	import type {
		ConfidenceLevel,
		DependencyComparisonStatus,
		EvidenceStatus,
		PackageBrief,
		RiskLevel,
		SourceLabel
	} from '$lib/server/analysis/types';

	let {
		data: initialData,
		form
	}: {
		data: PageData;
		form: ActionData;
	} = $props();

	function getInitialAnalysis() {
		return structuredClone(initialData.analysis);
	}

	function getShareUrl() {
		return initialData.shareUrl;
	}

	function getRadarReady() {
		return initialData.radarReady;
	}

	let activeAnalysis = $state(getInitialAnalysis());
	let isPolling = $state(false);
	let pollingError = $state<string | null>(null);

	const statusLabels = {
		queued: 'En cola',
		enriching: 'Enriqueciendo metadata',
		summarizing: 'Generando brief en n8n',
		completed: 'Listo para revisión',
		failed: 'Análisis fallido'
	} as const;

	const statusDescriptions = {
		queued: 'La corrida ya fue creada y quedó persistida en Postgres.',
		enriching: 'La app está consultando npm registry y calculando riesgo preliminar.',
		summarizing: 'n8n ya recibió el payload y está generando el brief ejecutivo.',
		completed: 'El brief final ya volvió, fue saneado y quedó disponible en esta URL.',
		failed: 'El flujo terminó con error. Revisa el panel técnico y vuelve a intentar si hace falta.'
	} as const;

	type AnalysisDependency = PageData['analysis']['dependencies'][number];
	type DependencyDisplayStatus = 'outdated' | 'covered_by_range' | 'up_to_date' | 'manual_review';

	$effect(() => {
		if (
			!browser ||
			activeAnalysis.status === 'completed' ||
			activeAnalysis.status === 'failed'
		) {
			isPolling = false;
			return;
		}

		const analysisId = activeAnalysis.id;
		let cancelled = false;
		let intervalId = 0;

		const refreshAnalysis = async () => {
			try {
				const response = await fetch(`/api/analyses/${analysisId}`);

				if (!response.ok) {
					const payload = (await response.json().catch(() => null)) as { message?: string } | null;
					throw new Error(payload?.message ?? 'No se pudo consultar el estado del análisis.');
				}

				const nextAnalysis = (await response.json()) as PageData['analysis'];

				if (cancelled) {
					return;
				}

				activeAnalysis = nextAnalysis;
				pollingError = null;

				if (nextAnalysis.status === 'completed' || nextAnalysis.status === 'failed') {
					clearInterval(intervalId);
					isPolling = false;
				}
			} catch (error) {
				if (cancelled) {
					return;
				}

				pollingError =
					error instanceof Error ? error.message : 'Ocurrió un error consultando el análisis.';
				clearInterval(intervalId);
				isPolling = false;
			}
		};

		isPolling = true;
		pollingError = null;
		void refreshAnalysis();
		intervalId = window.setInterval(() => {
			void refreshAnalysis();
		}, 2200);

		return () => {
			cancelled = true;
			clearInterval(intervalId);
			isPolling = false;
		};
	});

	const requestJson = $derived(JSON.stringify(activeAnalysis.requestPayload, null, 2));
	const callbackJson = $derived(
		activeAnalysis.callbackPayload ? JSON.stringify(activeAnalysis.callbackPayload, null, 2) : ''
	);
	const majorDependencies = $derived(
		activeAnalysis.dependencies.filter((dependency) => dependency.diffType === 'major').length
	);
	const minorDependencies = $derived(
		activeAnalysis.dependencies.filter((dependency) => dependency.diffType === 'minor').length
	);
	const patchDependencies = $derived(
		activeAnalysis.dependencies.filter((dependency) => dependency.diffType === 'patch').length
	);
	const deprecatedDependencies = $derived(
		activeAnalysis.dependencies.filter((dependency) => dependency.deprecated).length
	);
	const criticalDependencies = $derived(
		activeAnalysis.dependencies.filter((dependency) => !isCoveredBySpec(dependency)).slice(0, 8)
	);
	const coveredBySpecDependencies = $derived(
		activeAnalysis.dependencies.filter((dependency) => isCoveredBySpec(dependency)).slice(0, 8)
	);

	function formatTimestamp(value?: string) {
		if (!value) return 'Pendiente';

		return new Intl.DateTimeFormat('es-CO', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function getStatusTone(status: keyof typeof statusLabels) {
		return {
			queued: 'border-violet-300/70 bg-violet-100/80 text-violet-900',
			enriching: 'border-cyan-300/70 bg-cyan-100/80 text-cyan-900',
			summarizing: 'border-amber-300/70 bg-amber-100/80 text-amber-900',
			completed: 'border-emerald-300/70 bg-emerald-100/80 text-emerald-900',
			failed: 'border-rose-300/70 bg-rose-100/80 text-rose-900'
		}[status];
	}

	function getDecisionTone(decision: (typeof activeAnalysis.dependencies)[number]['decision']) {
		return {
			upgrade_now: 'bg-rose-100 text-rose-900',
			upgrade_later: 'bg-amber-100 text-amber-900',
			replace: 'bg-fuchsia-100 text-fuchsia-900',
			hold: 'bg-slate-100 text-slate-700'
		}[decision];
	}

	function getComparisonStatus(
		dependency: AnalysisDependency
	): DependencyComparisonStatus {
		return dependency.resolution?.comparisonStatus ?? 'unresolved';
	}

	function getDeclaredSpec(dependency: AnalysisDependency) {
		return dependency.resolution?.declaredSpec ?? dependency.currentVersion;
	}

	function getWantedVersion(dependency: AnalysisDependency) {
		return dependency.resolution?.wantedVersion ?? dependency.currentVersion;
	}

	function getLatestVersion(dependency: AnalysisDependency) {
		return dependency.resolution?.latestVersion ?? dependency.latestVersion;
	}

	function getDependencyDisplayStatus(dependency: AnalysisDependency): DependencyDisplayStatus {
		const comparisonStatus = getComparisonStatus(dependency);

		if (comparisonStatus === 'up_to_date') {
			return getDeclaredSpec(dependency) !== getWantedVersion(dependency)
				? 'covered_by_range'
				: 'up_to_date';
		}

		if (comparisonStatus === 'outdated') {
			return 'outdated';
		}

		return 'manual_review';
	}

	function isCoveredBySpec(dependency: AnalysisDependency) {
		const status = getDependencyDisplayStatus(dependency);
		return status === 'covered_by_range' || status === 'up_to_date';
	}

	function getDependencyStatusTone(status: DependencyDisplayStatus) {
		return {
			outdated: 'bg-rose-100 text-rose-900',
			covered_by_range: 'bg-cyan-100 text-cyan-900',
			up_to_date: 'bg-emerald-100 text-emerald-900',
			manual_review: 'bg-slate-100 text-slate-700'
		}[status];
	}

	function getDependencyStatusLabel(dependency: AnalysisDependency) {
		const displayStatus = getDependencyDisplayStatus(dependency);

		if (displayStatus === 'covered_by_range') {
			return 'covered by range';
		}

		if (displayStatus === 'up_to_date') {
			return 'up to date';
		}

		if (displayStatus === 'outdated') {
			return 'requiere cambio';
		}

		return {
			channel_pinned: 'channel pinned',
			manual_review: 'manual review',
			unresolved: 'review needed',
			unsupported: 'custom spec',
			up_to_date: 'up to date',
			outdated: 'requiere cambio'
		}[getComparisonStatus(dependency)];
	}

	function formatDependencyVersionLine(dependency: AnalysisDependency) {
		const declaredSpec = getDeclaredSpec(dependency);
		const wantedVersion = getWantedVersion(dependency);
		const latestVersion = getLatestVersion(dependency);
		const comparisonStatus = getComparisonStatus(dependency);
		const displayStatus = getDependencyDisplayStatus(dependency);

		if (comparisonStatus === 'outdated') {
			return `Spec ${declaredSpec} -> latest ${latestVersion}`;
		}

		if (displayStatus === 'covered_by_range') {
			return `Spec ${declaredSpec} · resuelve a ${wantedVersion} · latest ${latestVersion}`;
		}

		if (displayStatus === 'up_to_date') {
			return `Spec ${declaredSpec} · latest ${latestVersion}`;
		}

		if (comparisonStatus === 'channel_pinned') {
			return `Spec ${declaredSpec} · canal fijado · latest estable ${latestVersion}`;
		}

		return `Spec ${declaredSpec} · requiere revisión manual`;
	}

	function getRiskLevelTone(riskLevel?: RiskLevel) {
		return {
			high: 'bg-rose-100 text-rose-900',
			medium: 'bg-amber-100 text-amber-900',
			low: 'bg-emerald-100 text-emerald-900'
		}[riskLevel ?? 'medium'];
	}

	function getConfidenceTone(confidence?: ConfidenceLevel) {
		return {
			high: 'bg-emerald-100 text-emerald-900',
			medium: 'bg-cyan-100 text-cyan-900',
			low: 'bg-slate-100 text-slate-700'
		}[confidence ?? 'low'];
	}

	function getEvidenceTone(evidenceStatus?: EvidenceStatus) {
		return {
			verified: 'bg-emerald-100 text-emerald-900',
			partial: 'bg-amber-100 text-amber-900',
			none: 'bg-slate-100 text-slate-700'
		}[evidenceStatus ?? 'none'];
	}

	function formatSourceLabel(label: SourceLabel | string) {
		return (
			{
				npm: 'npm',
				'github-release': 'release',
				changelog: 'changelog',
				'migration-guide': 'migration guide',
				docs: 'docs',
				'fallback-search': 'fallback search',
				repository: 'repo',
				repo: 'repo'
			} as const
		)[label as SourceLabel | 'repo'] ?? label;
	}

	function extractReleaseVersionFromUrl(url: string) {
		try {
			const pathname = new URL(url).pathname;
			const releaseTagPrefix = '/releases/tag/';
			const tagIndex = pathname.indexOf(releaseTagPrefix);

			if (tagIndex === -1) {
				return null;
			}

			const tag = decodeURIComponent(pathname.slice(tagIndex + releaseTagPrefix.length)).trim();
			return tag || null;
		} catch {
			return null;
		}
	}

	function formatSourceDescriptor(source: {
		label: SourceLabel | string;
		url: string;
		version?: string | null;
	}) {
		const baseLabel = formatSourceLabel(source.label);

		if (source.label !== 'github-release') {
			return baseLabel;
		}

		const version = source.version?.trim() || extractReleaseVersionFromUrl(source.url);
		return version ? `${baseLabel} ${version}` : baseLabel;
	}

	function getEvidenceMessage(brief: Partial<PackageBrief>) {
		const evidenceStatus = brief.evidenceStatus ?? 'none';
		const confidence = brief.confidence ?? 'low';

		if (evidenceStatus === 'verified') {
			return `Brief respaldado por fuentes verificadas. Confidence ${confidence}.`;
		}

		if (evidenceStatus === 'partial') {
			return `La investigación encontró evidencia parcial. Revisa las fuentes antes de ejecutar cambios sensibles.`;
		}

		return 'No hubo evidencia suficiente para afirmar breaking changes verificables.';
	}
</script>

<svelte:head>
	<title>{activeAnalysis.project.name} | Package Version Wizard</title>
	<meta
		name="description"
		content="Vista persistida del análisis de dependencias, con progreso, brief AI y automatización continua."
	/>
</svelte:head>

<div class="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<section class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<a
						href="/"
						class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:bg-white"
					>
						Volver al wizard
					</a>
					<p class="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
						Análisis persistido
					</p>
					<h1 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
						{activeAnalysis.project.name}
					</h1>
					<p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
						{activeAnalysis.manifestName ?? 'package.json'}
						{#if activeAnalysis.manifestVersion}
							<span class="mx-2 text-slate-300">•</span>
							v{activeAnalysis.manifestVersion}
						{/if}
						<span class="mx-2 text-slate-300">•</span>
						{activeAnalysis.stats.total} dependencias detectadas
					</p>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					{#if getShareUrl()}
						<a
							href={getShareUrl()}
							target="_blank"
							rel="noreferrer"
							class="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:bg-white"
						>
							Abrir link público
						</a>
					{/if}
					<span
						class={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(activeAnalysis.status)}`}
					>
						{statusLabels[activeAnalysis.status]}
					</span>
				</div>
			</div>
		</section>

		<section class="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
			<div class="space-y-6">
				<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Progreso</p>
					<h2 class="mt-2 text-2xl font-bold text-slate-950">{statusLabels[activeAnalysis.status]}</h2>
					<p class="mt-3 text-sm leading-7 text-slate-600">{statusDescriptions[activeAnalysis.status]}</p>

					<div class="mt-6 grid gap-4 sm:grid-cols-2">
						<div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Creado</p>
							<p class="mt-2 text-sm text-slate-800">{formatTimestamp(activeAnalysis.createdAt)}</p>
						</div>
						<div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Callback</p>
							<p class="mt-2 text-sm text-slate-800">
								{formatTimestamp(activeAnalysis.callbackReceivedAt)}
							</p>
						</div>
					</div>

					{#if isPolling}
						<div class="mt-5 flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
							<span class="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-600"></span>
							La página sigue consultando el estado automáticamente.
						</div>
					{/if}

					{#if pollingError}
						<div class="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
							{pollingError}
						</div>
					{/if}

					{#if activeAnalysis.errorMessage}
						<div class="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
							{activeAnalysis.errorMessage}
						</div>
					{/if}

					<div class="mt-6 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dispatch</p>
						<div class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
							<div>
								<p class="text-slate-400">Status HTTP del webhook</p>
								<p class="mt-1 font-semibold text-white">
									{activeAnalysis.webhookResponse?.status ?? 'Pendiente'}
								</p>
							</div>
							<div>
								<p class="text-slate-400">Idempotency key</p>
								<p class="mt-1 break-all font-mono text-xs text-slate-200">
									{activeAnalysis.lastIdempotencyKey ?? 'Aún no llegó callback'}
								</p>
							</div>
						</div>
					</div>
				</div>

				<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Buckets de riesgo</p>
					<h2 class="mt-2 text-2xl font-bold text-slate-950">Qué cambió en el árbol</h2>

					<div class="mt-6 grid gap-4 sm:grid-cols-2">
						<div class="rounded-3xl border border-rose-200 bg-rose-50/90 p-5">
							<p class="text-sm font-semibold text-rose-950">Major upgrades</p>
							<p class="mt-2 text-4xl font-extrabold tracking-tight text-rose-950">{majorDependencies}</p>
						</div>
						<div class="rounded-3xl border border-fuchsia-200 bg-fuchsia-50/90 p-5">
							<p class="text-sm font-semibold text-fuchsia-950">Deprecated</p>
							<p class="mt-2 text-4xl font-extrabold tracking-tight text-fuchsia-950">{deprecatedDependencies}</p>
						</div>
						<div class="rounded-3xl border border-amber-200 bg-amber-50/90 p-5">
							<p class="text-sm font-semibold text-amber-950">Minor upgrades</p>
							<p class="mt-2 text-4xl font-extrabold tracking-tight text-amber-950">{minorDependencies}</p>
						</div>
						<div class="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-5">
							<p class="text-sm font-semibold text-emerald-950">Patch upgrades</p>
							<p class="mt-2 text-4xl font-extrabold tracking-tight text-emerald-950">{patchDependencies}</p>
						</div>
					</div>
				</div>

				<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Radar continuo</p>
							<h2 class="mt-2 text-2xl font-bold text-slate-950">Automatización Slack</h2>
						</div>
						{#if activeAnalysis.subscription?.enabled}
							<span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
								Activa
							</span>
						{/if}
					</div>

					<p class="mt-3 text-sm leading-7 text-slate-600">
						Conecta este proyecto al workflow de radar continuo para recibir cambios relevantes sin subir el manifiesto otra vez.
					</p>

					<form method="POST" action="?/saveSlackSubscription" class="mt-6 space-y-4">
						<label class="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
							<input
								name="enabled"
								type="checkbox"
								class="rounded border-slate-300 text-cyan-600 focus:ring-cyan-200"
								checked={activeAnalysis.subscription?.enabled ?? false}
							/>
							Activar radar por Slack para este proyecto
						</label>

						<div class="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
							<label class="block">
								<span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
									Canal o destino
								</span>
								<input
									name="channelTarget"
									type="text"
									placeholder="#platform-upgrades"
									value={activeAnalysis.subscription?.channelTarget ?? ''}
									class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
								/>
							</label>

							<label class="block">
								<span class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
									Frecuencia
								</span>
								<select
									name="frequency"
									class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
								>
									<option value="daily" selected={(activeAnalysis.subscription?.frequency ?? 'daily') === 'daily'}>
										Daily
									</option>
									<option
										value="weekdays"
										selected={activeAnalysis.subscription?.frequency === 'weekdays'}
									>
										Weekdays
									</option>
									<option
										value="twice_daily"
										selected={activeAnalysis.subscription?.frequency === 'twice_daily'}
									>
										Twice daily
									</option>
								</select>
							</label>
						</div>

						<button
							type="submit"
							class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
						>
							Guardar automatización
						</button>
					</form>

					{#if form?.message}
						<div class="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
							{form.message}
						</div>
					{/if}

					{#if !getRadarReady()}
						<div class="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
							Falta configurar `APP_BASE_URL` o `N8N_INTERNAL_API_TOKEN` para habilitar el radar continuo end-to-end.
						</div>
					{/if}
				</div>
			</div>

			<div class="space-y-6">
				<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Brief AI</p>
							<h2 class="mt-2 text-2xl font-bold text-slate-950">Resumen ejecutivo</h2>
						</div>
						{#if activeAnalysis.status === 'completed'}
							<span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
								Listo para revisar
							</span>
						{/if}
					</div>

					{#if activeAnalysis.status === 'completed' && activeAnalysis.renderedSummaryHtml}
						<div class="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
							<div class="prose prose-slate max-w-none prose-headings:font-bold prose-p:text-slate-700">
								{@html activeAnalysis.renderedSummaryHtml}
							</div>
						</div>
					{:else if activeAnalysis.status === 'failed'}
						<div class="mt-6 rounded-3xl border border-dashed border-rose-300 bg-rose-50/70 p-6">
							<p class="text-lg font-semibold text-rose-950">El brief no se pudo completar.</p>
							<p class="mt-2 text-sm leading-6 text-rose-900">
								La corrida quedó persistida con los datos técnicos disponibles para ayudarte a depurar el problema.
							</p>
						</div>
					{:else}
						<div class="mt-6 animate-pulse rounded-3xl border border-slate-200 bg-slate-50/90 p-6">
							<div class="h-4 w-24 rounded-full bg-slate-200"></div>
							<div class="mt-4 h-5 w-5/6 rounded-full bg-slate-200"></div>
							<div class="mt-3 h-5 w-4/6 rounded-full bg-slate-200"></div>
							<div class="mt-6 h-32 rounded-3xl bg-white"></div>
						</div>
					{/if}

					{#if activeAnalysis.callbackPayload?.upgradePlan.length}
						<div class="mt-6 grid gap-4 lg:grid-cols-2">
							{#each activeAnalysis.callbackPayload.upgradePlan as phase}
								<article class="rounded-3xl border border-slate-200 bg-white p-5">
									<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
										Fase {phase.wave}
									</p>
									<h3 class="mt-2 text-lg font-semibold text-slate-950">{phase.title}</h3>
									<p class="mt-3 text-sm leading-6 text-slate-600">{phase.rationale}</p>
									<div class="mt-4 flex flex-wrap gap-2">
										{#each phase.packages as packageName}
											<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
												{packageName}
											</span>
										{/each}
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>

				<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Dependencias críticas</p>
					<h2 class="mt-2 text-2xl font-bold text-slate-950">Lo primero que miraría un equipo</h2>

					<div class="mt-6 grid gap-4 xl:grid-cols-2">
						{#if criticalDependencies.length}
							{#each criticalDependencies as dependency}
								<article class="rounded-3xl border border-slate-200 bg-white p-5">
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="text-lg font-semibold text-slate-950">{dependency.name}</h3>
											<p class="mt-2 text-sm text-slate-500">
												{formatDependencyVersionLine(dependency)}
											</p>
										</div>
										<div class="flex flex-wrap justify-end gap-2">
											<span class={`rounded-full px-3 py-1 text-xs font-semibold ${getDependencyStatusTone(getDependencyDisplayStatus(dependency))}`}>
												{getDependencyStatusLabel(dependency)}
											</span>
											<span class={`rounded-full px-3 py-1 text-xs font-semibold ${getDecisionTone(dependency.decision)}`}>
												{dependency.decision}
											</span>
										</div>
									</div>

									<div class="mt-4 grid gap-3 sm:grid-cols-2">
										<div class="rounded-2xl bg-slate-50 px-4 py-3">
											<p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Grupo</p>
											<p class="mt-1 text-sm font-medium text-slate-900">{dependency.group}</p>
										</div>
										<div class="rounded-2xl bg-slate-50 px-4 py-3">
											<p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Risk score</p>
											<p class="mt-1 text-sm font-medium text-slate-900">{dependency.riskScore}/100</p>
										</div>
									</div>

									{#if dependency.deprecated}
										<div class="mt-4 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-950">
											Este paquete aparece como deprecated y merece atención prioritaria.
										</div>
									{/if}

									{#if dependency.sourceUrls.length}
										<div class="mt-4 flex flex-wrap gap-2">
											{#each dependency.sourceUrls as url}
												<a
													href={url}
													target="_blank"
													rel="noreferrer"
													class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
												>
													fuente
												</a>
											{/each}
										</div>
									{/if}
								</article>
							{/each}
						{:else}
							<div class="rounded-3xl border border-dashed border-cyan-200 bg-cyan-50/80 p-5 text-sm text-cyan-950 xl:col-span-2">
								No hay dependencias que requieran cambio real en el manifiesto o revisión manual prioritaria.
							</div>
						{/if}
					</div>
				</div>

				{#if coveredBySpecDependencies.length}
					<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Specs alineados</p>
						<h2 class="mt-2 text-2xl font-bold text-slate-950">Ya cubiertas por el manifiesto</h2>
						<p class="mt-3 text-sm leading-7 text-slate-600">
							Estas dependencias ya están cubiertas por el spec declarado o alineadas con la latest del registry. No requieren cambio inmediato en `package.json`.
						</p>

						<div class="mt-6 grid gap-4 xl:grid-cols-2">
							{#each coveredBySpecDependencies as dependency}
								<article class="rounded-3xl border border-slate-200 bg-white p-5">
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="text-lg font-semibold text-slate-950">{dependency.name}</h3>
											<p class="mt-2 text-sm text-slate-500">
												{formatDependencyVersionLine(dependency)}
											</p>
										</div>
										<div class="flex flex-wrap justify-end gap-2">
											<span class={`rounded-full px-3 py-1 text-xs font-semibold ${getDependencyStatusTone(getDependencyDisplayStatus(dependency))}`}>
												{getDependencyStatusLabel(dependency)}
											</span>
											<span class={`rounded-full px-3 py-1 text-xs font-semibold ${getDecisionTone(dependency.decision)}`}>
												{dependency.decision}
											</span>
										</div>
									</div>

									<div class="mt-4 grid gap-3 sm:grid-cols-2">
										<div class="rounded-2xl bg-slate-50 px-4 py-3">
											<p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Grupo</p>
											<p class="mt-1 text-sm font-medium text-slate-900">{dependency.group}</p>
										</div>
										<div class="rounded-2xl bg-slate-50 px-4 py-3">
											<p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Risk score</p>
											<p class="mt-1 text-sm font-medium text-slate-900">{dependency.riskScore}/100</p>
										</div>
									</div>

									{#if dependency.sourceUrls.length}
										<div class="mt-4 flex flex-wrap gap-2">
											{#each dependency.sourceUrls as url}
												<a
													href={url}
													target="_blank"
													rel="noreferrer"
													class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
												>
													fuente
												</a>
											{/each}
										</div>
									{/if}
								</article>
							{/each}
						</div>
					</div>
				{/if}

				{#if activeAnalysis.callbackPayload?.packageBriefs.length}
					<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Paquetes explicados</p>
						<h2 class="mt-2 text-2xl font-bold text-slate-950">Contexto por paquete</h2>

						<div class="mt-6 grid gap-4 xl:grid-cols-2">
							{#each activeAnalysis.callbackPayload.packageBriefs as brief}
								<article class="rounded-3xl border border-slate-200 bg-white p-5">
									<div class="flex items-start justify-between gap-3">
										<h3 class="text-lg font-semibold text-slate-950">{brief.name}</h3>
										<div class="flex flex-wrap justify-end gap-2">
											<span class={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskLevelTone(brief.riskLevel)}`}>
												{brief.riskLevel ?? 'medium'} risk
											</span>
											<span class={`rounded-full px-3 py-1 text-xs font-semibold ${getConfidenceTone(brief.confidence)}`}>
												confidence {brief.confidence ?? 'low'}
											</span>
											<span class={`rounded-full px-3 py-1 text-xs font-semibold ${getEvidenceTone(brief.evidenceStatus)}`}>
												{brief.evidenceStatus ?? 'none'}
											</span>
										</div>
									</div>
									<p class="mt-3 text-sm leading-6 text-slate-600">{brief.summary}</p>

									<div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
										{getEvidenceMessage(brief)}
									</div>

									{#if (brief.breakingChanges ?? []).length}
										<div class="mt-5">
											<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
												Breaking changes
											</p>
											<ul class="mt-2 space-y-2 text-sm text-slate-700">
												{#each brief.breakingChanges ?? [] as change}
													<li class="rounded-2xl bg-rose-50 px-3 py-2">{change}</li>
												{/each}
											</ul>
										</div>
									{/if}

									{#if (brief.recommendedActions ?? []).length}
										<div class="mt-5">
											<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
												Recommended actions
											</p>
											<ul class="mt-2 space-y-2 text-sm text-slate-700">
												{#each brief.recommendedActions ?? [] as action}
													<li class="rounded-2xl bg-slate-100 px-3 py-2">{action}</li>
												{/each}
											</ul>
										</div>
									{/if}

									{#if (brief.testFocus ?? []).length}
										<div class="mt-5">
											<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
												Test focus
											</p>
											<div class="mt-2 flex flex-wrap gap-2">
												{#each brief.testFocus ?? [] as focus}
													<span class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-900">
														{focus}
													</span>
												{/each}
											</div>
										</div>
									{/if}

									{#if (brief.sources ?? []).length}
										<div class="mt-5">
											<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
												Evidence
											</p>
											<div class="mt-2 grid gap-2">
												{#each brief.sources ?? [] as source}
													<a
														class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white"
														href={source.url}
														target="_blank"
														rel="noreferrer"
													>
														<span class="flex items-center gap-2">
															<span class="font-medium text-slate-900">{formatSourceDescriptor(source)}</span>
															<span class="text-xs text-slate-500">{source.packageName}</span>
														</span>
														<span class="font-mono text-xs text-slate-500">open</span>
													</a>
												{/each}
											</div>
										</div>
									{/if}
								</article>
							{/each}
						</div>
					</div>
				{/if}

				{#if activeAnalysis.callbackPayload?.sources.length}
					<div class="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Fuentes</p>
						<h2 class="mt-2 text-2xl font-bold text-slate-950">Trazabilidad del brief</h2>

						<div class="mt-6 grid gap-3">
							{#each activeAnalysis.callbackPayload.sources as source}
								<a
									class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white"
									href={source.url}
									target="_blank"
									rel="noreferrer"
								>
									<span>
										<span class="font-semibold text-slate-900">{source.packageName}</span>
										<span class="ml-2 text-slate-500">{formatSourceDescriptor(source)}</span>
									</span>
									<span class="font-mono text-xs text-slate-500">open</span>
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<details class="group rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
					<summary class="flex cursor-pointer list-none items-center justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
								Panel técnico
							</p>
							<h2 class="mt-2 text-2xl font-bold text-slate-950">Payload y callback crudos</h2>
						</div>
						<span class="text-sm font-medium text-slate-500 transition group-open:rotate-45">+</span>
					</summary>

					<div class="mt-6 grid gap-4 xl:grid-cols-2">
						<div class="rounded-3xl border border-slate-200 bg-slate-950 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
								Payload enviado
							</p>
							<pre class="mt-3 overflow-x-auto font-mono text-xs leading-6 text-slate-100">{requestJson}</pre>
						</div>

						<div class="rounded-3xl border border-slate-200 bg-slate-950 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
								Callback recibido
							</p>
							<pre class="mt-3 overflow-x-auto font-mono text-xs leading-6 text-slate-100">{callbackJson || 'Pendiente'}</pre>
						</div>
					</div>
				</details>
			</div>
		</section>
	</div>
</div>
