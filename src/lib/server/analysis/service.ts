import { createHash } from 'node:crypto';

import type {
	AnalysisSnapshot,
	ConfidenceLevel,
	DependencyCandidate,
	DependencyStats,
	EvidenceStatus,
	N8nAnalysisCallback,
	N8nAnalysisRequest,
	PackageBrief,
	ParsedPackageManifest,
	ProjectSnapshot,
	RiskLevel,
	SourceLink,
	SourceLabel,
	UpgradePhase
} from '$lib/server/analysis/types';
import { buildAnalysisUrl } from '$lib/server/app-url';
import { enrichManifestDependencies } from '$lib/server/npm/client';
import {
	applyCallback,
	createQueuedAnalysis,
	getAnalysisById,
	getLatestManifestByProject,
	getProjectById,
	getProjectByOwnerAndSlug,
	markAnalysisFailed,
	markAnalysisFailedIfPending,
	markAnalysisWebhookAccepted,
	savePreparedAnalysisData,
	setAnalysisStatus
} from '$lib/server/analysis/repository';
import { sendAnalysisToN8n } from '$lib/server/n8n/client';
import { parsePackageJsonText } from '$lib/server/package-json/manifest';
import { resolveSlackNotificationContext } from '$lib/server/slack/service';
import type { SlackNotificationContext, SlackNotificationResult } from '$lib/server/slack/types';

const MAX_N8N_CANDIDATES = 24;
const ANALYSIS_TIMEOUTS_MS = {
	queued: 60_000,
	enriching: 120_000,
	summarizing: 250_000
} as const;
const ANALYSIS_TIMEOUT_MESSAGE = 'El análisis excedió el tiempo máximo de espera del workflow.';

export async function startUploadedAnalysis(input: {
	parsedManifest: ParsedPackageManifest;
	requestedByUserId: string;
	requestedByUserName: string;
	projectIdOverride?: string;
}): Promise<{ analysisId: string }> {
	const analysisId = `analysis_${crypto.randomUUID()}`;
	const project = await resolveProjectIdentity({
		analysisId,
		projectIdOverride: input.projectIdOverride,
		projectName: input.parsedManifest.projectName,
		ownerUserId: input.requestedByUserId
	});
	const analysisUrl = buildAnalysisUrl(analysisId);
	const notificationContext = await resolveSlackNotificationContext({
		projectId: project.id,
		requestedByUserId: input.requestedByUserId,
		requestedByUserName: input.requestedByUserName
	});
	const initialStats = buildInitialStats(input.parsedManifest.dependencies.length);
	const initialRequestPayload = buildN8nAnalysisRequest({
		analysisId,
		projectName: project.name,
		analysisUrl,
		notificationContext,
		stats: initialStats,
		candidates: []
	});

	await createQueuedAnalysis({
		analysisId,
		project,
		manifestName: input.parsedManifest.fileName,
		manifest: input.parsedManifest.manifest,
		initialStats,
		initialRequestPayload
	});

	try {
		await setAnalysisStatus(analysisId, 'enriching');

		const { dependencies, stats } = await enrichManifestDependencies(
			input.parsedManifest.dependencies
		);
		const requestPayload = buildN8nAnalysisRequest({
			analysisId,
			projectName: project.name,
			analysisUrl,
			notificationContext,
			stats,
			candidates: dependencies.map(stripDependencyForN8n)
		});

		await savePreparedAnalysisData({
			analysisId,
			stats,
			requestPayload,
			dependencies
		});

		const response = await sendAnalysisToN8n(requestPayload);
		await markAnalysisWebhookAccepted(analysisId, response);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'No se pudo completar el análisis del package.json.';
		await markAnalysisFailed(analysisId, message);
	}

	return { analysisId };
}

export async function startReanalysisFromProject(projectId: string) {
	const project = await getProjectById(projectId);

	if (!project) {
		throw new Error('No existe un proyecto persistido con ese projectId.');
	}

	const latestManifest = await getLatestManifestByProject(projectId);

	if (!latestManifest) {
		throw new Error('Ese proyecto no tiene un package.json persistido para reutilizar.');
	}

	const parsedManifest = parsePackageJsonText(
		JSON.stringify(latestManifest.manifest),
		latestManifest.manifestName
	);

	return startUploadedAnalysis({
		parsedManifest,
		requestedByUserId: project.ownerUserId ?? 'system',
		requestedByUserName: 'Sistema',
		projectIdOverride: project.id
	});
}

export async function getAnalysisSnapshot(id: string): Promise<AnalysisSnapshot | null> {
	const analysis = await getAnalysisById(id);

	if (!analysis) {
		return null;
	}

	if (!hasAnalysisTimedOut(analysis)) {
		return analysis;
	}

	await setAnalysisStatus(id, 'failed', {
		errorMessage: ANALYSIS_TIMEOUT_MESSAGE,
		completedAt: true
	});

	return getAnalysisById(id);
}

export async function persistN8nCallback(
	idempotencyKey: string,
	payload: N8nAnalysisCallback,
	rawBody: string
) {
	const payloadHash = createHash('sha256').update(rawBody).digest('hex');

	return applyCallback(idempotencyKey, payload, payloadHash);
}

export async function failAnalysisFromInvalidN8nCallback(value: unknown, errorMessage: string) {
	const analysisId = tryExtractAnalysisIdFromCallback(value);

	if (!analysisId) {
		return false;
	}

	return markAnalysisFailedIfPending(analysisId, `n8n envió un callback inválido: ${errorMessage}`);
}

export function parseN8nCallbackPayload(value: unknown): N8nAnalysisCallback {
	const record = asRecord(value, 'payload');
	const status = asStatus(record.status);

	if (status === 'failed') {
		return {
			analysisId: asString(record.analysisId, 'analysisId'),
			status,
			executiveSummaryMd: asFailureSummary(record),
			upgradePlan: [],
			packageBriefs: [],
			slackDigestMd: undefined,
			slackNotification: asSlackNotification(record.slackNotification),
			sources: []
		};
	}

	return {
		analysisId: asString(record.analysisId, 'analysisId'),
		status,
		executiveSummaryMd: asOptionalString(record.executiveSummaryMd),
		upgradePlan: asUpgradePlanArray(record.upgradePlan),
		packageBriefs: asPackageBriefArray(record.packageBriefs),
		slackDigestMd: asUndefinedOrString(record.slackDigestMd),
		slackNotification: asSlackNotification(record.slackNotification),
		sources: asSourceArray(record.sources)
	};
}

function resolveProjectIdentity(input: {
	analysisId: string;
	projectName?: string;
	projectIdOverride?: string;
	ownerUserId: string;
}): Promise<ProjectSnapshot> | ProjectSnapshot {
	if (input.projectIdOverride) {
		return getProjectById(input.projectIdOverride).then((project) => {
			if (!project) {
				throw new Error('No existe el proyecto a reanalizar.');
			}

			return {
				...project,
				name: input.projectName ?? project.name
			};
		});
	}

	const projectName = input.projectName ?? `upload-${input.analysisId.slice(-8)}`;
	const slug = slugify(projectName);

	return getProjectByOwnerAndSlug(input.ownerUserId, slug).then((existingProject) => {
		if (existingProject) {
			return {
				...existingProject,
				name: projectName
			};
		}

		return {
			id: `project_${crypto.randomUUID()}`,
			slug,
			name: projectName,
			ecosystem: 'npm',
			ownerUserId: input.ownerUserId
		};
	});
}

function buildInitialStats(total: number): DependencyStats {
	return {
		total,
		outdated: 0,
		majors: 0,
		minors: 0,
		patches: 0,
		deprecated: 0
	};
}

function buildN8nAnalysisRequest(input: {
	analysisId: string;
	projectName: string;
	analysisUrl?: string;
	notificationContext: SlackNotificationContext;
	stats: DependencyStats;
	candidates: DependencyCandidate[];
}): N8nAnalysisRequest {
	return {
		analysisId: input.analysisId,
		projectName: input.projectName,
		analysisUrl: input.analysisUrl,
		dependencyStats: {
			total: input.stats.total,
			outdated: input.stats.outdated,
			majors: input.stats.majors,
			deprecated: input.stats.deprecated
		},
		candidates: input.candidates
			.filter(
				(candidate) =>
					candidate.deprecated ||
					candidate.diffType !== 'unknown' ||
					candidate.resolution.requiresManualReview
			)
			.sort((left, right) => right.riskScore - left.riskScore)
			.slice(0, MAX_N8N_CANDIDATES),
		notificationContext: {
			slack: input.notificationContext
		}
	};
}

function stripDependencyForN8n(
	dependency: AnalysisSnapshot['dependencies'][number]
): DependencyCandidate {
	return {
		name: dependency.name,
		currentVersion: dependency.currentVersion,
		latestVersion: dependency.latestVersion,
		group: dependency.group,
		diffType: dependency.diffType,
		deprecated: dependency.deprecated,
		publishedAt: dependency.publishedAt,
		repositoryUrl: dependency.repositoryUrl,
		riskScore: dependency.riskScore,
		sourceUrls: dependency.sourceUrls,
		resolution: dependency.resolution
	};
}

function hasAnalysisTimedOut(analysis: AnalysisSnapshot) {
	if (analysis.status === 'completed' || analysis.status === 'failed') {
		return false;
	}

	const timeoutMs = ANALYSIS_TIMEOUTS_MS[analysis.status];

	if (!timeoutMs) {
		return false;
	}

	const updatedAtMs = new Date(analysis.updatedAt).getTime();

	return Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs > timeoutMs;
}

function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
		.slice(0, 80);
}

function asRecord(value: unknown, fieldName: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`El campo ${fieldName} debe ser un objeto.`);
	}

	return value as Record<string, unknown>;
}

function tryExtractAnalysisIdFromCallback(value: unknown) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const analysisId = (value as Record<string, unknown>).analysisId;

	return typeof analysisId === 'string' && analysisId.trim() ? analysisId : null;
}

function asString(value: unknown, fieldName: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`El campo ${fieldName} debe ser un string no vacío.`);
	}

	return value;
}

function asOptionalStringField(value: unknown, fieldName: string) {
	if (value == null) {
		return undefined;
	}

	return asString(value, fieldName);
}

function asBoolean(value: unknown, fieldName: string) {
	if (typeof value !== 'boolean') {
		throw new Error(`El campo ${fieldName} debe ser booleano.`);
	}

	return value;
}

function asOptionalString(value: unknown): string {
	if (value == null) {
		return '';
	}

	return asString(value, 'executiveSummaryMd');
}

function asUndefinedOrString(value: unknown): string | undefined {
	if (value == null) {
		return undefined;
	}

	return asString(value, 'slackDigestMd');
}

function asSlackNotification(value: unknown): SlackNotificationResult | undefined {
	if (value == null) {
		return undefined;
	}

	const record = asRecord(value, 'slackNotification');

	return {
		attempted: asBoolean(record.attempted, 'slackNotification.attempted'),
		status: asSlackNotificationStatus(record.status),
		channelId: asOptionalStringField(record.channelId, 'slackNotification.channelId'),
		channelName: asOptionalStringField(record.channelName, 'slackNotification.channelName'),
		reason: asOptionalStringField(record.reason, 'slackNotification.reason'),
		notifiedAt: asOptionalStringField(record.notifiedAt, 'slackNotification.notifiedAt')
	};
}

function asFailureSummary(record: Record<string, unknown>) {
	const message = record.message;

	if (typeof message === 'string' && message.trim()) {
		return message;
	}

	const executiveSummary = record.executiveSummaryMd;

	if (typeof executiveSummary === 'string' && executiveSummary.trim()) {
		return executiveSummary;
	}

	return 'No se pudo generar el brief final en n8n.';
}

function asStatus(value: unknown): 'completed' | 'failed' {
	if (value !== 'completed' && value !== 'failed') {
		throw new Error('El campo status debe ser "completed" o "failed".');
	}

	return value;
}

function asStringArray(value: unknown, fieldName: string): string[] {
	if (value == null) {
		return [];
	}

	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw new Error(`El campo ${fieldName} debe ser un array de strings.`);
	}

	return value;
}

function asUpgradePlanArray(value: unknown): UpgradePhase[] {
	if (value == null) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new Error('El campo upgradePlan debe ser un array.');
	}

	return value.map((entry, index) => {
		const phase = asRecord(entry, `upgradePlan[${index}]`);

		return {
			wave: asNumber(phase.wave, `upgradePlan[${index}].wave`),
			title: asString(phase.title, `upgradePlan[${index}].title`),
			rationale: asString(phase.rationale, `upgradePlan[${index}].rationale`),
			packages: asStringArray(phase.packages, `upgradePlan[${index}].packages`)
		};
	});
}

function asPackageBriefArray(value: unknown): PackageBrief[] {
	if (value == null) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new Error('El campo packageBriefs debe ser un array.');
	}

	return value.map((entry, index) => {
		const brief = asRecord(entry, `packageBriefs[${index}]`);

		return {
			name: asString(brief.name, `packageBriefs[${index}].name`),
			summary: asString(brief.summary, `packageBriefs[${index}].summary`),
			breakingChanges: asStringArray(
				brief.breakingChanges,
				`packageBriefs[${index}].breakingChanges`
			),
			testFocus: asStringArray(brief.testFocus, `packageBriefs[${index}].testFocus`),
			riskLevel: asRiskLevel(brief.riskLevel),
			confidence: asConfidenceLevel(brief.confidence),
			evidenceStatus: asEvidenceStatus(brief.evidenceStatus),
			recommendedActions: asStringArray(
				brief.recommendedActions,
				`packageBriefs[${index}].recommendedActions`
			),
			sources: asSourceArray(brief.sources)
		};
	});
}

function asSourceArray(value: unknown): SourceLink[] {
	if (value == null) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new Error('El campo sources debe ser un array.');
	}

	return value.map((entry, index) => {
		const source = asRecord(entry, `sources[${index}]`);

		return {
			packageName: asString(source.packageName, `sources[${index}].packageName`),
			label: asSourceLabel(source.label, `sources[${index}].label`),
			url: asString(source.url, `sources[${index}].url`)
		};
	});
}

function asRiskLevel(value: unknown): RiskLevel {
	if (value == null) {
		return 'medium';
	}

	if (value === 'low' || value === 'medium' || value === 'high') {
		return value;
	}

	throw new Error('El campo packageBriefs[].riskLevel debe ser low, medium o high.');
}

function asConfidenceLevel(value: unknown): ConfidenceLevel {
	if (value == null) {
		return 'low';
	}

	if (value === 'low' || value === 'medium' || value === 'high') {
		return value;
	}

	throw new Error('El campo packageBriefs[].confidence debe ser low, medium o high.');
}

function asEvidenceStatus(value: unknown): EvidenceStatus {
	if (value == null) {
		return 'none';
	}

	if (value === 'verified' || value === 'partial' || value === 'none') {
		return value;
	}

	throw new Error('El campo packageBriefs[].evidenceStatus debe ser verified, partial o none.');
}

function asSourceLabel(value: unknown, fieldName: string): SourceLabel {
	if (value === 'repo') {
		return 'repository';
	}

	if (
		value === 'npm' ||
		value === 'github-release' ||
		value === 'changelog' ||
		value === 'migration-guide' ||
		value === 'docs' ||
		value === 'fallback-search' ||
		value === 'repository'
	) {
		return value;
	}

	throw new Error(
		`El campo ${fieldName} debe ser uno de: npm, github-release, changelog, migration-guide, docs, fallback-search, repository.`
	);
}

function asNumber(value: unknown, fieldName: string): number {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		throw new Error(`El campo ${fieldName} debe ser numérico.`);
	}

	return value;
}

function asSlackNotificationStatus(value: unknown): SlackNotificationResult['status'] {
	if (value === 'sent' || value === 'skipped' || value === 'failed') {
		return value;
	}

	throw new Error('El campo slackNotification.status debe ser sent, skipped o failed.');
}
