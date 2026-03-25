import type {
	AnalysisStatus,
	ConfidenceLevel,
	DependencyComparisonStatus,
	DependencyDecision,
	EvidenceStatus,
	PackageBrief,
	RiskLevel,
	SourceLabel
} from '$lib/server/analysis/types';
import type { AnalysisDependency, DependencyDisplayStatus } from '$lib/ui/analysis/types';

export const analysisStatusLabels: Record<AnalysisStatus, string> = {
	queued: 'En cola',
	enriching: 'Resolviendo metadata',
	summarizing: 'Generando brief',
	completed: 'Listo para revisión',
	failed: 'Análisis fallido'
};

export const analysisStatusDescriptions: Record<AnalysisStatus, string> = {
	queued: 'La corrida fue creada y quedó persistida. El procesamiento ya puede retomarse desde esta URL.',
	enriching: 'La app consulta el registry, normaliza versiones y prepara el contexto técnico.',
	summarizing: 'El workflow externo está armando el brief y las recomendaciones de ejecución.',
	completed: 'La corrida ya tiene resumen renderizado, dependencias priorizadas y evidencia disponible.',
	failed: 'El flujo terminó con error. La corrida conserva suficiente contexto para revisar qué ocurrió.'
};

export function formatTimestamp(value?: string) {
	if (!value) return 'Pendiente';

	return new Intl.DateTimeFormat('es-CO', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(value));
}

export function getStatusTone(status: AnalysisStatus) {
	return {
		queued: 'border-violet-400/20 bg-violet-400/12 text-violet-100',
		enriching: 'border-cyan-400/20 bg-cyan-400/12 text-cyan-100',
		summarizing: 'border-amber-400/20 bg-amber-400/12 text-amber-100',
		completed: 'border-emerald-400/20 bg-emerald-400/12 text-emerald-100',
		failed: 'border-rose-400/20 bg-rose-400/12 text-rose-100'
	}[status];
}

export function getDecisionTone(decision: DependencyDecision) {
	return {
		upgrade_now: 'border-rose-400/20 bg-rose-400/12 text-rose-100',
		upgrade_later: 'border-amber-400/20 bg-amber-400/12 text-amber-100',
		replace: 'border-fuchsia-400/20 bg-fuchsia-400/12 text-fuchsia-100',
		hold: 'border-white/10 bg-white/8 text-slate-200'
	}[decision];
}

export function getDecisionLabel(decision: DependencyDecision) {
	return {
		upgrade_now: 'actuar ahora',
		upgrade_later: 'planificar',
		replace: 'reemplazar',
		hold: 'mantener'
	}[decision];
}

export function getComparisonStatus(dependency: AnalysisDependency): DependencyComparisonStatus {
	return dependency.resolution?.comparisonStatus ?? 'unresolved';
}

export function getDeclaredSpec(dependency: AnalysisDependency) {
	return dependency.resolution?.declaredSpec ?? dependency.currentVersion;
}

export function getWantedVersion(dependency: AnalysisDependency) {
	return dependency.resolution?.wantedVersion ?? dependency.currentVersion;
}

export function getLatestVersion(dependency: AnalysisDependency) {
	return dependency.resolution?.latestVersion ?? dependency.latestVersion;
}

export function getDependencyDisplayStatus(
	dependency: AnalysisDependency
): DependencyDisplayStatus {
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

export function isCoveredBySpec(dependency: AnalysisDependency) {
	const status = getDependencyDisplayStatus(dependency);
	return status === 'covered_by_range' || status === 'up_to_date';
}

export function getDependencyStatusTone(status: DependencyDisplayStatus) {
	return {
		outdated: 'border-rose-400/20 bg-rose-400/12 text-rose-100',
		covered_by_range: 'border-cyan-400/20 bg-cyan-400/12 text-cyan-100',
		up_to_date: 'border-emerald-400/20 bg-emerald-400/12 text-emerald-100',
		manual_review: 'border-white/10 bg-white/8 text-slate-200'
	}[status];
}

export function getDependencyStatusLabel(dependency: AnalysisDependency) {
	const displayStatus = getDependencyDisplayStatus(dependency);

	if (displayStatus === 'covered_by_range') {
		return 'cubierto por rango';
	}

	if (displayStatus === 'up_to_date') {
		return 'al día';
	}

	if (displayStatus === 'outdated') {
		return 'requiere cambio';
	}

	return {
		channel_pinned: 'canal fijado',
		manual_review: 'revisión manual',
		unresolved: 'revisar',
		unsupported: 'spec custom',
		up_to_date: 'al día',
		outdated: 'requiere cambio'
	}[getComparisonStatus(dependency)];
}

export function formatDependencyVersionLine(dependency: AnalysisDependency) {
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

export function getRiskLevelTone(riskLevel?: RiskLevel) {
	return {
		high: 'border-rose-400/20 bg-rose-400/12 text-rose-100',
		medium: 'border-amber-400/20 bg-amber-400/12 text-amber-100',
		low: 'border-emerald-400/20 bg-emerald-400/12 text-emerald-100'
	}[riskLevel ?? 'medium'];
}

export function getConfidenceTone(confidence?: ConfidenceLevel) {
	return {
		high: 'border-emerald-400/20 bg-emerald-400/12 text-emerald-100',
		medium: 'border-cyan-400/20 bg-cyan-400/12 text-cyan-100',
		low: 'border-white/10 bg-white/8 text-slate-200'
	}[confidence ?? 'low'];
}

export function getEvidenceTone(evidenceStatus?: EvidenceStatus) {
	return {
		verified: 'border-emerald-400/20 bg-emerald-400/12 text-emerald-100',
		partial: 'border-amber-400/20 bg-amber-400/12 text-amber-100',
		none: 'border-white/10 bg-white/8 text-slate-200'
	}[evidenceStatus ?? 'none'];
}

export function formatSourceLabel(label: SourceLabel | string) {
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

export function extractReleaseVersionFromUrl(url: string) {
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

export function formatSourceDescriptor(source: {
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

export function getEvidenceMessage(brief: Partial<PackageBrief>) {
	const evidenceStatus = brief.evidenceStatus ?? 'none';
	const confidence = brief.confidence ?? 'low';

	if (evidenceStatus === 'verified') {
		return `Brief respaldado por fuentes verificadas. Confidence ${confidence}.`;
	}

	if (evidenceStatus === 'partial') {
		return 'La investigación encontró evidencia parcial. Conviene revisar las fuentes antes de ejecutar cambios sensibles.';
	}

	return 'No hubo evidencia suficiente para afirmar cambios delicados con respaldo verificable.';
}
