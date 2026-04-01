import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import type { N8nAnalysisCallback } from '$lib/server/analysis/types';
import { updateAnalysisSlackNotification } from '$lib/server/analysis/repository';
import {
	failAnalysisFromInvalidN8nCallback,
	parseN8nCallbackPayload,
	persistN8nCallback
} from '$lib/server/analysis/service';
import { deliverSlackNotificationForAnalysis } from '$lib/server/slack/service';

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
	let rawBody = '';

	try {
		rawBody = await request.text();
		body = JSON.parse(rawBody) as unknown;
	} catch {
		return json({ message: 'El callback de n8n no contiene JSON válido.' }, { status: 400 });
	}

	let payload: N8nAnalysisCallback;

	try {
		payload = parseN8nCallbackPayload(body);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'El callback de n8n no cumple el contrato esperado.';

		await failAnalysisFromInvalidN8nCallback(body, message);

		return json({ message }, { status: 400 });
	}

	const result = await persistN8nCallback(idempotencyKey, payload, rawBody);

	if (result.type === 'missing') {
		return json({ message: 'No existe un análisis para ese analysisId.' }, { status: 404 });
	}

	if (result.analysis?.callbackPayload && !result.analysis.slackNotification) {
		const slackNotification = await deliverSlackNotificationForAnalysis(result.analysis);
		await updateAnalysisSlackNotification(result.analysis.id, slackNotification);
	}

	if (result.type === 'duplicate') {
		return json({ ok: true, duplicate: true, status: result.analysis?.status });
	}

	return json({ ok: true, status: result.analysis?.status });
};
