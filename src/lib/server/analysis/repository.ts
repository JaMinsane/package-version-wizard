import { renderMarkdownToSafeHtml } from '$lib/server/markdown';
import { getDb } from '$lib/server/db/client';
import type {
	AnalysisSnapshot,
	AnalysisStatus,
	DependencySnapshot,
	DependencyStats,
	N8nAnalysisCallback,
	N8nAnalysisRequest,
	PackageJsonManifest,
	ProjectSnapshot,
	RadarSubscriptionRecord,
	SlackFrequency,
	SlackSubscriptionSnapshot
} from '$lib/server/analysis/types';

type DatabaseClient = ReturnType<typeof getDb>;

interface AnalysisRow {
	id: string;
	status: AnalysisStatus;
	manifest_name: string | null;
	manifest_json: unknown;
	stats_json: unknown;
	created_at: Date | string;
	updated_at: Date | string;
	completed_at: Date | string | null;
	callback_received_at: Date | string | null;
	request_payload_json: unknown;
	callback_payload_json: unknown;
	summary_html: string | null;
	error_message: string | null;
	webhook_response_json: unknown;
	last_idempotency_key: string | null;
	project_id: string;
	project_slug: string;
	project_name: string;
	project_ecosystem: 'npm';
}

interface DependencyRow {
	name: string;
	dependency_group: DependencySnapshot['group'];
	current_version: string;
	latest_version: string;
	diff_type: DependencySnapshot['diffType'];
	deprecated: boolean;
	published_at: Date | string | null;
	repository_url: string | null;
	risk_score: number;
	decision: DependencySnapshot['decision'] | null;
	source_urls_json: unknown;
}

interface SubscriptionRow {
	channel_type: 'slack';
	channel_target: string;
	frequency: SlackFrequency;
	enabled: boolean;
	updated_at: Date | string;
}

interface ProjectRow {
	id: string;
	slug: string;
	name: string;
	ecosystem: 'npm';
}

interface RadarSubscriptionRow {
	project_id: string;
	project_name: string;
	project_slug: string;
	channel_type: 'slack';
	channel_target: string;
	frequency: SlackFrequency;
	latest_analysis_id: string | null;
	latest_completed_analysis_id: string | null;
}

export interface ApplyCallbackResult {
	type: 'applied' | 'duplicate' | 'missing';
	analysis?: AnalysisSnapshot;
}

export interface CreateQueuedAnalysisInput {
	analysisId: string;
	project: ProjectSnapshot;
	manifestName: string;
	manifest: PackageJsonManifest;
	initialStats: DependencyStats;
	initialRequestPayload: N8nAnalysisRequest;
}

export async function createQueuedAnalysis(
	input: CreateQueuedAnalysisInput
): Promise<AnalysisSnapshot> {
	const db = getDb();

	await db.begin(async (tx: DatabaseClient) => {
		await tx`
			INSERT INTO projects (id, slug, name, ecosystem)
			VALUES (${input.project.id}, ${input.project.slug}, ${input.project.name}, 'npm')
			ON CONFLICT (id)
			DO UPDATE SET
				slug = EXCLUDED.slug,
				name = EXCLUDED.name,
				updated_at = now()
		`;

		await tx`
			INSERT INTO analyses (
				id,
				project_id,
				status,
				manifest_name,
				manifest_json,
				stats_json,
				request_payload_json
			)
			VALUES (
				${input.analysisId},
				${input.project.id},
				${'queued'},
				${input.manifestName},
				CAST(${JSON.stringify(input.manifest)} AS jsonb),
				CAST(${JSON.stringify(input.initialStats)} AS jsonb),
				CAST(${JSON.stringify(input.initialRequestPayload)} AS jsonb)
			)
		`;
	});

	const analysis = await getAnalysisById(input.analysisId);

	if (!analysis) {
		throw new Error('No se pudo recuperar el análisis recién creado.');
	}

	return analysis;
}

export async function setAnalysisStatus(
	id: string,
	status: AnalysisStatus,
	options?: {
		errorMessage?: string | null;
		completedAt?: boolean;
	}
) {
	const db = getDb();

	await db`
		UPDATE analyses
		SET
			status = ${status},
			error_message = ${options?.errorMessage ?? null},
			updated_at = now(),
			completed_at = ${options?.completedAt ? new Date() : null}
		WHERE id = ${id}
	`;
}

export async function savePreparedAnalysisData(input: {
	analysisId: string;
	stats: DependencyStats;
	requestPayload: N8nAnalysisRequest;
	dependencies: DependencySnapshot[];
}) {
	const db = getDb();

	await db.begin(async (tx: DatabaseClient) => {
		await tx`
			UPDATE analyses
			SET
				stats_json = CAST(${JSON.stringify(input.stats)} AS jsonb),
				request_payload_json = CAST(${JSON.stringify(input.requestPayload)} AS jsonb),
				updated_at = now()
			WHERE id = ${input.analysisId}
		`;

		await tx`
			DELETE FROM analysis_dependencies
			WHERE analysis_id = ${input.analysisId}
		`;

		for (const dependency of input.dependencies) {
			await tx`
				INSERT INTO analysis_dependencies (
					analysis_id,
					name,
					dependency_group,
					current_version,
					latest_version,
					diff_type,
					deprecated,
					published_at,
					repository_url,
					risk_score,
					decision,
					source_urls_json
				)
				VALUES (
					${input.analysisId},
					${dependency.name},
					${dependency.group},
					${dependency.currentVersion},
					${dependency.latestVersion},
					${dependency.diffType},
					${dependency.deprecated},
					${dependency.publishedAt ? new Date(dependency.publishedAt) : null},
					${dependency.repositoryUrl ?? null},
					${dependency.riskScore},
					${dependency.decision},
					CAST(${JSON.stringify(dependency.sourceUrls)} AS jsonb)
				)
			`;
		}
	});
}

export async function getAnalysisById(id: string): Promise<AnalysisSnapshot | null> {
	const db = getDb();
	const analysisRows = await db<AnalysisRow[]>`
		SELECT
			a.id,
			a.status,
			a.manifest_name,
			a.manifest_json,
			a.stats_json,
			a.created_at,
			a.updated_at,
			a.completed_at,
			a.request_payload_json,
			a.callback_payload_json,
			a.summary_html,
			a.error_message,
			a.webhook_response_json,
			a.last_idempotency_key,
			p.id AS project_id,
			p.slug AS project_slug,
			p.name AS project_name,
			p.ecosystem AS project_ecosystem,
			(
				SELECT received_at
				FROM analysis_callback_receipts acr
				WHERE acr.analysis_id = a.id
				ORDER BY acr.received_at DESC
				LIMIT 1
			) AS callback_received_at
		FROM analyses a
		INNER JOIN projects p ON p.id = a.project_id
		WHERE a.id = ${id}
		LIMIT 1
	`;

	const analysisRow = analysisRows[0];

	if (!analysisRow) {
		return null;
	}

	const dependencyRows = await db<DependencyRow[]>`
		SELECT
			name,
			dependency_group,
			current_version,
			latest_version,
			diff_type,
			deprecated,
			published_at,
			repository_url,
			risk_score,
			decision,
			source_urls_json
		FROM analysis_dependencies
		WHERE analysis_id = ${id}
		ORDER BY risk_score DESC, name ASC
	`;

	const subscriptionRows = await db<SubscriptionRow[]>`
		SELECT
			channel_type,
			channel_target,
			frequency,
			enabled,
			updated_at
		FROM automation_subscriptions
		WHERE project_id = ${analysisRow.project_id}
			AND channel_type = 'slack'
		ORDER BY updated_at DESC
		LIMIT 1
	`;

	return mapAnalysisRow(analysisRow, dependencyRows, subscriptionRows[0]);
}

export async function markAnalysisWebhookAccepted(
	id: string,
	webhookResponse: {
		status: number;
		body?: string | null;
	}
) {
	const db = getDb();

	await db`
		UPDATE analyses
		SET
			status = ${'summarizing'},
			webhook_response_json = CAST(${JSON.stringify(webhookResponse)} AS jsonb),
			error_message = NULL,
			updated_at = now(),
			completed_at = NULL
		WHERE id = ${id}
	`;
}

export async function markAnalysisFailed(id: string, message: string) {
	const db = getDb();

	await db`
		UPDATE analyses
		SET
			status = ${'failed'},
			error_message = ${message},
			updated_at = now(),
			completed_at = now()
		WHERE id = ${id}
	`;
}

export async function markAnalysisFailedIfPending(id: string, message: string) {
	const db = getDb();
	const rows = await db<{ id: string }[]>`
		UPDATE analyses
		SET
			status = ${'failed'},
			error_message = ${message},
			updated_at = now(),
			completed_at = now()
		WHERE id = ${id}
			AND status NOT IN (${'completed'}, ${'failed'})
		RETURNING id
	`;

	return rows.length > 0;
}

export async function applyCallback(
	idempotencyKey: string,
	payload: N8nAnalysisCallback,
	payloadHash: string
): Promise<ApplyCallbackResult> {
	const db = getDb();

	const outcome = await db.begin(async (tx: DatabaseClient) => {
		const existingRows = await tx<{ id: string; status: AnalysisStatus }[]>`
			SELECT id, status
			FROM analyses
			WHERE id = ${payload.analysisId}
			FOR UPDATE
		`;

		const existing = existingRows[0];

		if (!existing) {
			return { type: 'missing' as const };
		}

		if (existing.status === 'completed' || existing.status === 'failed') {
			return { type: 'duplicate' as const };
		}

		const receiptRows = await tx<{ id: number }[]>`
			INSERT INTO analysis_callback_receipts (
				analysis_id,
				idempotency_key,
				payload_hash
			)
			VALUES (
				${payload.analysisId},
				${idempotencyKey},
				${payloadHash}
			)
			ON CONFLICT (idempotency_key)
			DO NOTHING
			RETURNING id
		`;

		if (receiptRows.length === 0) {
			return { type: 'duplicate' as const };
		}

		const renderedSummaryHtml = renderMarkdownToSafeHtml(payload.executiveSummaryMd);
		const errorMessage =
			payload.status === 'failed'
				? payload.executiveSummaryMd || 'n8n devolvió un estado fallido.'
				: null;

		await tx`
			UPDATE analyses
			SET
				status = ${payload.status},
				callback_payload_json = CAST(${JSON.stringify(payload)} AS jsonb),
				summary_markdown = ${payload.executiveSummaryMd},
				summary_html = ${renderedSummaryHtml},
				upgrade_plan_json = CAST(${JSON.stringify(payload.upgradePlan)} AS jsonb),
				package_briefs_json = CAST(${JSON.stringify(payload.packageBriefs)} AS jsonb),
				sources_json = CAST(${JSON.stringify(payload.sources)} AS jsonb),
				slack_digest_markdown = ${payload.slackDigestMd ?? null},
				error_message = ${errorMessage},
				last_idempotency_key = ${idempotencyKey},
				updated_at = now(),
				completed_at = now()
			WHERE id = ${payload.analysisId}
		`;

		return { type: 'applied' as const };
	});

	if (outcome.type === 'missing') {
		return outcome;
	}

	return {
		type: outcome.type,
		analysis: (await getAnalysisById(payload.analysisId)) ?? undefined
	};
}

export async function getProjectById(id: string): Promise<ProjectSnapshot | null> {
	const db = getDb();
	const rows = await db<ProjectRow[]>`
		SELECT id, slug, name, ecosystem
		FROM projects
		WHERE id = ${id}
		LIMIT 1
	`;

	const row = rows[0];

	return row
		? {
				id: row.id,
				slug: row.slug,
				name: row.name,
				ecosystem: row.ecosystem
			}
		: null;
}

export async function getLatestManifestByProject(projectId: string) {
	const db = getDb();
	const rows = await db<{ manifest_name: string | null; manifest_json: unknown }[]>`
		SELECT manifest_name, manifest_json
		FROM analyses
		WHERE project_id = ${projectId}
			AND manifest_json IS NOT NULL
		ORDER BY created_at DESC
		LIMIT 1
	`;

	const row = rows[0];

	if (!row) {
		return null;
	}

	return {
		manifestName: row.manifest_name ?? 'package.json',
		manifest: parseJsonColumn<PackageJsonManifest>(row.manifest_json)
	};
}

export async function saveSlackSubscription(input: {
	projectId: string;
	enabled: boolean;
	channelTarget: string;
	frequency: SlackFrequency;
}) {
	const db = getDb();

	await db.begin(async (tx: DatabaseClient) => {
		await tx`
			UPDATE automation_subscriptions
			SET
				enabled = false,
				updated_at = now()
			WHERE project_id = ${input.projectId}
				AND channel_type = 'slack'
		`;

		if (!input.channelTarget) {
			return;
		}

		await tx`
			INSERT INTO automation_subscriptions (
				project_id,
				channel_type,
				channel_target,
				enabled,
				frequency
			)
			VALUES (
				${input.projectId},
				${'slack'},
				${input.channelTarget},
				${input.enabled},
				${input.frequency}
			)
			ON CONFLICT (project_id, channel_type, channel_target)
			DO UPDATE SET
				enabled = EXCLUDED.enabled,
				frequency = EXCLUDED.frequency,
				updated_at = now()
		`;
	});
}

export async function listRadarSubscriptions(): Promise<RadarSubscriptionRecord[]> {
	const db = getDb();
	const rows = await db<RadarSubscriptionRow[]>`
		SELECT
			p.id AS project_id,
			p.name AS project_name,
			p.slug AS project_slug,
			s.channel_type,
			s.channel_target,
			s.frequency,
			(
				SELECT a.id
				FROM analyses a
				WHERE a.project_id = p.id
				ORDER BY a.created_at DESC
				LIMIT 1
			) AS latest_analysis_id,
			(
				SELECT a.id
				FROM analyses a
				WHERE a.project_id = p.id
					AND a.status = 'completed'
				ORDER BY a.completed_at DESC NULLS LAST, a.created_at DESC
				LIMIT 1
			) AS latest_completed_analysis_id
		FROM automation_subscriptions s
		INNER JOIN projects p ON p.id = s.project_id
		WHERE s.channel_type = 'slack'
			AND s.enabled = true
		ORDER BY p.name ASC
	`;

	return rows.map((row) => ({
		projectId: row.project_id,
		projectName: row.project_name,
		projectSlug: row.project_slug,
		channelType: row.channel_type,
		channelTarget: row.channel_target,
		frequency: row.frequency,
		latestAnalysisId: row.latest_analysis_id ?? undefined,
		latestCompletedAnalysisId: row.latest_completed_analysis_id ?? undefined
	}));
}

function mapAnalysisRow(
	row: AnalysisRow,
	dependencies: DependencyRow[],
	subscriptionRow?: SubscriptionRow
): AnalysisSnapshot {
	const manifest = row.manifest_json ? parseJsonColumn<PackageJsonManifest>(row.manifest_json) : undefined;
	const stats = parseJsonColumn<DependencyStats>(row.stats_json);

	return {
		id: row.id,
		project: {
			id: row.project_id,
			slug: row.project_slug,
			name: row.project_name,
			ecosystem: row.project_ecosystem
		},
		status: row.status,
		manifestName: row.manifest_name ?? undefined,
		manifestVersion: manifest?.version,
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		completedAt: toOptionalIsoString(row.completed_at),
		callbackReceivedAt: toOptionalIsoString(row.callback_received_at),
		stats,
		dependencies: dependencies.map(mapDependencyRow),
		requestPayload: parseJsonColumn<N8nAnalysisRequest>(row.request_payload_json),
		callbackPayload: row.callback_payload_json
			? parseJsonColumn<N8nAnalysisCallback>(row.callback_payload_json)
			: undefined,
		renderedSummaryHtml: row.summary_html ?? undefined,
		errorMessage: row.error_message ?? undefined,
		webhookResponse: row.webhook_response_json
			? parseJsonColumn<{
					status: number;
					body?: string | null;
				}>(row.webhook_response_json)
			: undefined,
		lastIdempotencyKey: row.last_idempotency_key ?? undefined,
		subscription: subscriptionRow ? mapSubscriptionRow(subscriptionRow) : undefined
	};
}

function mapDependencyRow(row: DependencyRow): DependencySnapshot {
	return {
		name: row.name,
		currentVersion: row.current_version,
		latestVersion: row.latest_version,
		group: row.dependency_group,
		diffType: row.diff_type,
		deprecated: row.deprecated,
		publishedAt: toOptionalIsoString(row.published_at),
		repositoryUrl: row.repository_url ?? undefined,
		riskScore: row.risk_score,
		decision: row.decision ?? 'hold',
		sourceUrls: parseJsonColumn<string[]>(row.source_urls_json)
	};
}

function mapSubscriptionRow(row: SubscriptionRow): SlackSubscriptionSnapshot {
	return {
		channelType: row.channel_type,
		channelTarget: row.channel_target,
		frequency: row.frequency,
		enabled: row.enabled,
		updatedAt: toIsoString(row.updated_at)
	};
}

function parseJsonColumn<T>(value: unknown): T {
	if (typeof value === 'string') {
		return JSON.parse(value) as T;
	}

	return value as T;
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toOptionalIsoString(value: Date | string | null): string | undefined {
	return value ? toIsoString(value) : undefined;
}
