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
	enriching: 'Consultando npm',
	summarizing: 'Generando brief',
	completed: 'Listo',
	failed: 'Fallido'
};

export const analysisStatusDescriptions: Record<AnalysisStatus, string> = {
	queued: 'El análisis fue creado y se puede retomar desde esta URL.',
	enriching: 'Consultando versiones en npm y preparando el contexto técnico.',
	summarizing: 'El workflow externo está armando el brief y las recomendaciones.',
	completed: 'Brief, dependencias priorizadas y fuentes disponibles.',
	failed: 'La corrida terminó con error. El contexto se conserva para diagnóstico.'
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
		queued: 'neon-badge neon-badge--violet',
		enriching: 'neon-badge neon-badge--cyan',
		summarizing: 'neon-badge neon-badge--amber',
		completed: 'neon-badge neon-badge--green',
		failed: 'neon-badge neon-badge--red'
	}[status];
}

export function getDecisionTone(decision: DependencyDecision) {
	return {
		upgrade_now: 'neon-badge neon-badge--red',
		upgrade_later: 'neon-badge neon-badge--amber',
		replace: 'neon-badge neon-badge--violet',
		hold: 'neon-badge neon-badge--muted'
	}[decision];
}

export function getDecisionLabel(decision: DependencyDecision) {
	return {
		upgrade_now: 'mover ahora',
		upgrade_later: 'dejar en cola',
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
		outdated: 'neon-badge neon-badge--red',
		covered_by_range: 'neon-badge neon-badge--cyan',
		up_to_date: 'neon-badge neon-badge--green',
		manual_review: 'neon-badge neon-badge--muted'
	}[status];
}

export function getDependencyStatusLabel(dependency: AnalysisDependency) {
	const displayStatus = getDependencyDisplayStatus(dependency);

	if (displayStatus === 'covered_by_range') {
		return 'resuelto por rango';
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
		unsupported: 'spec especial',
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
		return `Spec ${declaredSpec} · resuelve ${wantedVersion} · latest ${latestVersion}`;
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
		high: 'neon-badge neon-badge--red',
		medium: 'neon-badge neon-badge--amber',
		low: 'neon-badge neon-badge--green'
	}[riskLevel ?? 'medium'];
}

export function getRiskLevelLabel(riskLevel?: RiskLevel) {
	return {
		high: 'riesgo alto',
		medium: 'riesgo medio',
		low: 'riesgo bajo'
	}[riskLevel ?? 'medium'];
}

export function getConfidenceTone(confidence?: ConfidenceLevel) {
	return {
		high: 'neon-badge neon-badge--green',
		medium: 'neon-badge neon-badge--cyan',
		low: 'neon-badge neon-badge--muted'
	}[confidence ?? 'low'];
}

export function getConfidenceLabel(confidence?: ConfidenceLevel) {
	return {
		high: 'confianza alta',
		medium: 'confianza media',
		low: 'confianza baja'
	}[confidence ?? 'low'];
}

export function getEvidenceTone(evidenceStatus?: EvidenceStatus) {
	return {
		verified: 'neon-badge neon-badge--green',
		partial: 'neon-badge neon-badge--amber',
		none: 'neon-badge neon-badge--muted'
	}[evidenceStatus ?? 'none'];
}

export function getEvidenceLabel(evidenceStatus?: EvidenceStatus) {
	return {
		verified: 'verificado',
		partial: 'parcial',
		none: 'sin evidencia'
	}[evidenceStatus ?? 'none'];
}

export function formatSourceLabel(label: SourceLabel | string) {
	return (
		{
			npm: 'npm',
			'github-release': 'release',
			changelog: 'changelog',
			'migration-guide': 'guía de migración',
			docs: 'docs',
			'fallback-search': 'búsqueda fallback',
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
		return `Respaldado por fuentes verificadas. ${getConfidenceLabel(confidence)}.`;
	}

	if (evidenceStatus === 'partial') {
		return 'Evidencia parcial. Revisa las fuentes antes de ejecutar cambios sensibles.';
	}

	return 'Sin evidencia suficiente para respaldar cambios críticos.';
}
