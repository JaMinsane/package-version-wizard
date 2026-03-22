import { renderMarkdownToSafeHtml } from '$lib/server/markdown';
import { getDb } from '$lib/server/db/client';
import type {
	AnalysisSnapshot,
	AnalysisStatus,
	DependencyCandidate,
	N8nAnalysisCallback,
	N8nAnalysisRequest,
	ProjectSnapshot
} from '$lib/server/analysis/types';

type DatabaseClient = ReturnType<typeof getDb>;

interface AnalysisRow {
	id: string;
	status: AnalysisStatus;
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

export interface ApplyCallbackResult {
	type: 'applied' | 'duplicate' | 'missing';
	analysis?: AnalysisSnapshot;
}

export async function createAnalysis(requestPayload: N8nAnalysisRequest): Promise<AnalysisSnapshot> {
	const db = getDb();
	const project = createProjectIdentity(requestPayload.projectName);

	await db.begin(async (tx: DatabaseClient) => {
		await tx`
			INSERT INTO projects (id, slug, name, ecosystem)
			VALUES (${project.id}, ${project.slug}, ${project.name}, 'npm')
			ON CONFLICT (slug)
			DO UPDATE SET
				name = EXCLUDED.name,
				updated_at = now()
		`;

		await tx`
			INSERT INTO analyses (
				id,
				project_id,
				status,
				stats_json,
				request_payload_json
			)
			VALUES (
				${requestPayload.analysisId},
				${project.id},
				${'sending'},
				CAST(${JSON.stringify(requestPayload.dependencyStats)} AS jsonb),
				CAST(${JSON.stringify(requestPayload)} AS jsonb)
			)
		`;

		for (const candidate of requestPayload.candidates) {
			await insertDependencyCandidate(tx, requestPayload.analysisId, candidate);
		}
	});

	const analysis = await getAnalysisById(requestPayload.analysisId);

	if (!analysis) {
		throw new Error('No se pudo recuperar el análisis recién creado.');
	}

	return analysis;
}

export async function getAnalysisById(id: string): Promise<AnalysisSnapshot | null> {
	const db = getDb();
	const rows = await db<AnalysisRow[]>`
		SELECT
			a.id,
			a.status,
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

	const row = rows[0];

	return row ? mapAnalysisRow(row) : null;
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
			status = ${'waiting_callback'},
			webhook_response_json = CAST(${JSON.stringify(webhookResponse)} AS jsonb),
			error_message = NULL,
			updated_at = now()
		WHERE id = ${id}
	`;
}

export async function markAnalysisWebhookFailed(id: string, message: string) {
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
			return { type: 'missing' };
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

function createProjectIdentity(projectName: string): ProjectSnapshot {
	const slug = slugify(projectName);

	return {
		id: `project_${slug}`,
		slug,
		name: projectName,
		ecosystem: 'npm'
	};
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')
		.slice(0, 80);
}

async function insertDependencyCandidate(
	tx: DatabaseClient,
	analysisId: string,
	candidate: DependencyCandidate
) {
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
			source_urls_json
		)
		VALUES (
			${analysisId},
			${candidate.name},
			${candidate.group},
			${candidate.currentVersion},
			${candidate.latestVersion},
			${candidate.diffType},
			${candidate.deprecated},
			${candidate.publishedAt ? new Date(candidate.publishedAt) : null},
			${candidate.repositoryUrl ?? null},
			${candidate.riskScore},
			CAST(${JSON.stringify([])} AS jsonb)
		)
	`;
}

function mapAnalysisRow(row: AnalysisRow): AnalysisSnapshot {
	return {
		id: row.id,
		project: {
			id: row.project_id,
			slug: row.project_slug,
			name: row.project_name,
			ecosystem: row.project_ecosystem
		},
		status: row.status,
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		completedAt: toOptionalIsoString(row.completed_at),
		callbackReceivedAt: toOptionalIsoString(row.callback_received_at),
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
		lastIdempotencyKey: row.last_idempotency_key ?? undefined
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
