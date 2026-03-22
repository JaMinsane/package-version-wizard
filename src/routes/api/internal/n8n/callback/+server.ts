import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { applyN8nCallback } from '$lib/server/demo/store';
import type { N8nAnalysisCallback, PackageBrief, SourceLink, UpgradeWave } from '$lib/server/demo/types';

export const POST: RequestHandler = async ({ request }) => {
	const expectedSignature = env.N8N_CALLBACK_SECRET;
	const signature = request.headers.get('x-n8n-signature');
	const idempotencyKey = request.headers.get('x-idempotency-key');

	if (!expectedSignature) {
		return json({ message: 'Falta configurar N8N_CALLBACK_SECRET.' }, { status: 500 });
	}

	if (signature !== expectedSignature) {
		return json({ message: 'Firma inválida para callback de n8n.' }, { status: 401 });
	}

	if (!idempotencyKey) {
		return json({ message: 'Falta el header x-idempotency-key.' }, { status: 400 });
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return json({ message: 'El callback de n8n no contiene JSON válido.' }, { status: 400 });
	}

	let payload: N8nAnalysisCallback;

	try {
		payload = parseCallbackPayload(body);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'El callback de n8n no cumple el contrato esperado.';

		return json({ message }, { status: 400 });
	}

	const result = applyN8nCallback(idempotencyKey, payload);

	if (result.type === 'missing') {
		return json({ message: 'No existe una corrida demo para ese analysisId.' }, { status: 404 });
	}

	if (result.type === 'duplicate') {
		return json({ ok: true, duplicate: true, status: result.run.status });
	}

	return json({ ok: true, status: result.run.status });
};

function parseCallbackPayload(value: unknown): N8nAnalysisCallback {
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

function asUpgradePlanArray(value: unknown): UpgradeWave[] {
	if (value == null) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new Error('El campo upgradePlan debe ser un array.');
	}

	return value.map((entry, index) => {
		const wave = asRecord(entry, `upgradePlan[${index}]`);

		return {
			wave: asNumber(wave.wave, `upgradePlan[${index}].wave`),
			title: asString(wave.title, `upgradePlan[${index}].title`),
			rationale: asString(wave.rationale, `upgradePlan[${index}].rationale`),
			packages: asStringArray(wave.packages, `upgradePlan[${index}].packages`)
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
