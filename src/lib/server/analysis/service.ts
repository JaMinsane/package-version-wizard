import { createHash } from 'node:crypto';

import type {
	AnalysisSnapshot,
	N8nAnalysisCallback,
	PackageBrief,
	SourceLink,
	UpgradePhase
} from '$lib/server/analysis/types';
import { buildDemoAnalysisRequest } from '$lib/server/analysis/demo';
import {
	applyCallback,
	createAnalysis,
	getAnalysisById,
	markAnalysisWebhookAccepted,
	markAnalysisWebhookFailed
} from '$lib/server/analysis/repository';
import { sendAnalysisToN8n } from '$lib/server/n8n/client';

export async function startDemoAnalysis(): Promise<{ analysisId: string }> {
	const requestPayload = buildDemoAnalysisRequest();

	await createAnalysis(requestPayload);

	try {
		const response = await sendAnalysisToN8n(requestPayload);
		await markAnalysisWebhookAccepted(requestPayload.analysisId, response);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'No se pudo enviar la corrida demo a n8n.';
		await markAnalysisWebhookFailed(requestPayload.analysisId, message);
	}

	return { analysisId: requestPayload.analysisId };
}

export async function getAnalysisSnapshot(id: string): Promise<AnalysisSnapshot | null> {
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

export function parseN8nCallbackPayload(value: unknown): N8nAnalysisCallback {
	const record = asRecord(value, 'payload');
	const status = asStatus(record.status);

	return {
		analysisId: asString(record.analysisId, 'analysisId'),
		status,
		executiveSummaryMd: asOptionalString(record.executiveSummaryMd),
		upgradePlan: asUpgradePlanArray(record.upgradePlan),
		packageBriefs: asPackageBriefArray(record.packageBriefs),
		slackDigestMd: asUndefinedOrString(record.slackDigestMd),
		sources: asSourceArray(record.sources)
	};
}

function asRecord(value: unknown, fieldName: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`El campo ${fieldName} debe ser un objeto.`);
	}

	return value as Record<string, unknown>;
}

function asString(value: unknown, fieldName: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`El campo ${fieldName} debe ser un string no vacío.`);
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
			testFocus: asStringArray(brief.testFocus, `packageBriefs[${index}].testFocus`)
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
			label: asString(source.label, `sources[${index}].label`),
			url: asString(source.url, `sources[${index}].url`)
		};
	});
}

function asNumber(value: unknown, fieldName: string): number {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		throw new Error(`El campo ${fieldName} debe ser numérico.`);
	}

	return value;
}
